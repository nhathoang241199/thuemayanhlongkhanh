import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeService } from './claude.service';
import {
  howToRentReply,
  isHowToRentQuestion,
} from './messenger-canned-replies';
import { FacebookGraphService } from './facebook-graph.service';
import {
  getMessengerConfig,
  isMessengerConfigured,
} from './messenger.config';
import {
  ESCALATE_KEYWORDS,
  MENU_PAYLOADS,
  type MessengerMessagingEvent,
  type MessengerWebhookBody,
} from './messenger.types';

const HISTORY_LIMIT = 20;
const processingPsids = new Set<string>();

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: FacebookGraphService,
    private readonly claude: ClaudeService,
  ) {}

  handleWebhookAsync(body: MessengerWebhookBody): void {
    if (body.object !== 'page' || !body.entry?.length) return;

    for (const entry of body.entry) {
      for (const event of entry.messaging ?? []) {
        void this.handleEvent(event).catch((err) => {
          this.logger.error(
            `handleEvent failed psid=${event.sender.id}`,
            err instanceof Error ? err.stack : err,
          );
        });
      }
    }
  }

  private async handleEvent(event: MessengerMessagingEvent): Promise<void> {
    const psid = event.sender.id;
    if (processingPsids.has(psid)) return;
    processingPsids.add(psid);

    try {
      const text = this.extractInboundText(event);
      if (!text) return;

      if (!isMessengerConfigured()) {
        this.logger.warn('Messenger bot chưa cấu hình đủ env');
        return;
      }

      const config = getMessengerConfig();
      const conversation = await this.prisma.messengerConversation.upsert({
        where: { psid },
        create: { psid },
        update: {},
      });

      if (conversation.handoffToAdmin) {
        await this.notifyAdmin(psid, `[Đang handoff] Khách: ${text}`);
        await this.graph.sendText(
          psid,
          'Mình đã chuyển tin cho admin — bạn chờ trong giây lát nhé.',
        );
        return;
      }

      if (this.shouldEscalate(text, event)) {
        await this.escalate(psid, text);
        return;
      }

      if (isHowToRentQuestion(text)) {
        const reply = howToRentReply(config.frontendUrl);
        await this.saveMessage(conversation.id, 'user', text);
        await this.saveMessage(conversation.id, 'assistant', reply);
        await this.graph.sendTextWithQuickReplies(
          psid,
          reply,
          this.graph.getDefaultQuickReplies(),
        );
        return;
      }

      const menuReply = this.menuPromptForPayload(text, event);
      const userContent = menuReply ?? text;

      await this.graph.sendTypingOn(psid);
      await this.saveMessage(conversation.id, 'user', userContent);

      const history = await this.getRecentHistory(conversation.id);
      const reply = await this.claude.reply(history, config.frontendUrl);

      await this.saveMessage(conversation.id, 'assistant', reply);
      await this.graph.sendTextWithQuickReplies(
        psid,
        reply,
        this.graph.getDefaultQuickReplies(),
      );
    } finally {
      processingPsids.delete(psid);
    }
  }

  private extractInboundText(event: MessengerMessagingEvent): string | null {
    if (event.message?.text) return event.message.text.trim();
    if (event.message?.quick_reply?.payload) {
      return event.message.quick_reply.payload;
    }
    if (event.postback?.payload) return event.postback.payload;
    return null;
  }

  private shouldEscalate(
    text: string,
    event: MessengerMessagingEvent,
  ): boolean {
    const payload = event.postback?.payload ?? event.message?.quick_reply?.payload;
    if (payload === MENU_PAYLOADS.ADMIN) return true;
    const lower = text.toLowerCase().trim();
    return ESCALATE_KEYWORDS.some((kw) => lower === kw || lower.includes(kw));
  }

  private menuPromptForPayload(
    text: string,
    event: MessengerMessagingEvent,
  ): string | null {
    const payload =
      event.postback?.payload ??
      event.message?.quick_reply?.payload ??
      text;

    switch (payload) {
      case MENU_PAYLOADS.PRICES:
        return 'Khách xem giá — liệt kê tối đa 3 máy phù hợp, trả lời 2 câu, hỏi hãng hoặc mục đích thuê.';
      case MENU_PAYLOADS.AVAILABILITY:
        return 'Khách check lịch — hỏi ngày nhận/trả và máy, dùng tool availability, trả lời 2 câu.';
      case MENU_PAYLOADS.TERMS:
        return 'Khách hỏi cọc — get_booking_terms, tóm tắt 2–3 ý chính trong 2 câu.';
      default:
        return null;
    }
  }

  private async escalate(psid: string, lastMessage: string): Promise<void> {
    await this.prisma.messengerConversation.update({
      where: { psid },
      data: { handoffToAdmin: true },
    });

    await this.notifyAdmin(
      psid,
      `Khách cần tư vấn trực tiếp.\nTin gần nhất: ${lastMessage}`,
    );

    await this.graph.sendText(
      psid,
      'Mình đã chuyển cho admin — bạn chờ trong vài phút nhé. Cảm ơn bạn!',
    );
  }

  private async notifyAdmin(psid: string, summary: string): Promise<void> {
    const { adminPsid } = getMessengerConfig();
    if (!adminPsid) {
      this.logger.warn(`Admin notify (no ADMIN_MESSENGER_PSID): ${summary}`);
      return;
    }
    try {
      await this.graph.sendText(
        adminPsid,
        `[Messenger] PSID ${psid}\n${summary}`,
      );
    } catch (err) {
      this.logger.error('notifyAdmin failed', err);
    }
  }

  private async saveMessage(
    conversationId: string,
    role: string,
    content: string,
  ): Promise<void> {
    await this.prisma.messengerMessage.create({
      data: { conversationId, role, content },
    });
    await this.prisma.messengerConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  private async getRecentHistory(
    conversationId: string,
  ): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
    const rows = await this.prisma.messengerMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    return rows
      .reverse()
      .filter((r) => r.role === 'user' || r.role === 'assistant')
      .map((r) => ({
        role: r.role as 'user' | 'assistant',
        content: r.content,
      }));
  }

  async sendWelcome(psid: string): Promise<void> {
    await this.graph.sendTextWithQuickReplies(
      psid,
      'Chào bạn! Mình là trợ lý Thuê máy ảnh Long Khánh. Bạn cần tư vấn gì ạ?',
      this.graph.getDefaultQuickReplies(),
    );
  }
}
