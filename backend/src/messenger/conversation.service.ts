import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeService } from './claude.service';
import {
  howToRentReply,
  isHowToRentQuestion,
} from './messenger-canned-replies';
import { FacebookGraphService } from './facebook-graph.service';
import {
  getHandoffDurationMs,
  getMessengerConfig,
  isMessengerConfigured,
} from './messenger.config';
import { truncateMessengerReply } from './messenger-reply-format';
import {
  ESCALATE_KEYWORDS,
  MENU_PAYLOADS,
  matchesEscalateKeyword,
  shouldResetBot,
  type MessengerMessagingEvent,
  type MessengerWebhookBody,
} from './messenger.types';

const HISTORY_LIMIT = 20;
const MESSAGE_JOIN = '\n---\n';

type PendingBatch = {
  texts: string[];
  timer: ReturnType<typeof setTimeout>;
  conversationId: string;
};

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly pendingByPsid = new Map<string, PendingBatch>();
  private readonly processingPsids = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: FacebookGraphService,
    private readonly claude: ClaudeService,
  ) {}

  handleWebhookAsync(body: MessengerWebhookBody): void {
    if (body.object !== 'page' || !body.entry?.length) return;

    for (const entry of body.entry) {
      for (const event of entry.messaging ?? []) {
        void this.routeEvent(event).catch((err) => {
          this.logger.error(
            `routeEvent failed psid=${event.sender.id}`,
            err instanceof Error ? err.stack : err,
          );
        });
      }
    }
  }

  private async routeEvent(event: MessengerMessagingEvent): Promise<void> {
    const text = this.extractInboundText(event);
    if (!text) return;

    if (!isMessengerConfigured()) {
      this.logger.warn('Messenger bot chưa cấu hình đủ env');
      return;
    }

    const psid = event.sender.id;

    if (this.shouldProcessImmediately(event, text)) {
      this.cancelPending(psid);
      await this.handleImmediate(event, text);
      return;
    }

    await this.enqueueText(psid, text);
  }

  private shouldProcessImmediately(
    event: MessengerMessagingEvent,
    text: string,
  ): boolean {
    if (event.postback?.payload) return true;
    if (event.message?.quick_reply?.payload) return true;
    if (shouldResetBot(text)) return true;
    if (this.shouldEscalate(text, event)) return true;
    return false;
  }

  private cancelPending(psid: string): void {
    const pending = this.pendingByPsid.get(psid);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingByPsid.delete(psid);
  }

  private async enqueueText(psid: string, text: string): Promise<void> {
    const { inactivityMs } = getMessengerConfig();
    let pending = this.pendingByPsid.get(psid);

    if (!pending) {
      const conversation = await this.prisma.messengerConversation.upsert({
        where: { psid },
        create: { psid },
        update: {},
      });
      pending = {
        texts: [],
        timer: setTimeout(() => undefined, 0),
        conversationId: conversation.id,
      };
      this.pendingByPsid.set(psid, pending);
    }

    pending.texts.push(text);
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      void this.flushPending(psid).catch((err) => {
        this.logger.error(
          `flushPending failed psid=${psid}`,
          err instanceof Error ? err.stack : err,
        );
      });
    }, inactivityMs);
  }

  private async flushPending(psid: string): Promise<void> {
    const pending = this.pendingByPsid.get(psid);
    if (!pending) return;
    this.pendingByPsid.delete(psid);
    clearTimeout(pending.timer);

    const combined = pending.texts.join(MESSAGE_JOIN);
    await this.processMessage(psid, combined, pending.conversationId, null);
  }

  private async handleImmediate(
    event: MessengerMessagingEvent,
    text: string,
  ): Promise<void> {
    const psid = event.sender.id;
    const conversation = await this.prisma.messengerConversation.upsert({
      where: { psid },
      create: { psid },
      update: {},
    });
    await this.processMessage(psid, text, conversation.id, event);
  }

  private async processMessage(
    psid: string,
    text: string,
    conversationId: string,
    event: MessengerMessagingEvent | null,
  ): Promise<void> {
    if (this.processingPsids.has(psid)) return;
    this.processingPsids.add(psid);

    try {
      const config = getMessengerConfig();

      if (shouldResetBot(text)) {
        await this.prisma.messengerConversation.update({
          where: { psid },
          data: { handoffUntil: null },
        });
        await this.graph.sendTextWithQuickReplies(
          psid,
          'Em đây ạ — anh/chị cần em tư vấn gì không?',
          this.graph.getDefaultQuickReplies(),
        );
        return;
      }

      const conversation = await this.prisma.messengerConversation.findUnique({
        where: { psid },
      });
      if (!conversation) return;

      const now = new Date();
      if (conversation.handoffUntil && conversation.handoffUntil > now) {
        await this.notifyAdmin(psid, `[Handoff 24h] Khách: ${text}`);
        return;
      }

      if (conversation.handoffUntil && conversation.handoffUntil <= now) {
        await this.prisma.messengerConversation.update({
          where: { psid },
          data: { handoffUntil: null },
        });
      }

      if (event && this.shouldEscalate(text, event)) {
        await this.escalate(psid, text);
        return;
      }

      if (isHowToRentQuestion(text)) {
        const reply = howToRentReply(config.frontendUrl);
        await this.saveMessage(conversationId, 'user', text);
        await this.saveMessage(conversationId, 'assistant', reply);
        await this.graph.sendTextWithQuickReplies(
          psid,
          reply,
          this.graph.getDefaultQuickReplies(),
        );
        return;
      }

      const menuReply = event ? this.menuPromptForPayload(text, event) : null;
      const userContent = menuReply ?? text;

      await this.graph.sendTypingOn(psid);
      await this.saveMessage(conversationId, 'user', userContent);

      const history = await this.getRecentHistory(conversationId);
      const rawReply = await this.claude.reply(history, config.frontendUrl);
      const reply = truncateMessengerReply(rawReply);

      await this.saveMessage(conversationId, 'assistant', reply);
      await this.graph.sendTextWithQuickReplies(
        psid,
        reply,
        this.graph.getDefaultQuickReplies(),
      );
    } finally {
      this.processingPsids.delete(psid);
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
    const payload =
      event.postback?.payload ?? event.message?.quick_reply?.payload;
    if (payload === MENU_PAYLOADS.ADMIN) return true;
    const lower = text.toLowerCase().trim();
    return ESCALATE_KEYWORDS.some((kw) => matchesEscalateKeyword(lower, kw));
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
        return 'Khách xem giá — liệt kê tối đa 3 máy, trả lời 1–2 câu.';
      case MENU_PAYLOADS.AVAILABILITY:
        return 'Khách check lịch — trả lời 1–2 câu tone anh/em: còn máy + hướng lên trang đặt lịch. Không gọi tool, không liệt kê máy.';
      case MENU_PAYLOADS.TERMS:
        return 'Khách hỏi cọc — get_booking_terms, tóm tắt 1–2 câu.';
      default:
        return null;
    }
  }

  private async escalate(psid: string, lastMessage: string): Promise<void> {
    const handoffUntil = new Date(Date.now() + getHandoffDurationMs());

    await this.prisma.messengerConversation.update({
      where: { psid },
      data: { handoffUntil },
    });

    await this.notifyAdmin(
      psid,
      `Khách cần tư vấn trực tiếp.\nTin gần nhất: ${lastMessage}`,
    );

    await this.graph.sendText(
      psid,
      'Em đã chuyển cho admin rồi ạ — anh/chị chờ trong vài phút nhé. Sau 24h em sẽ trả lời lại, hoặc gõ BOT nếu cần em ngay.',
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
      'Chào anh/chị! Em là trợ lý Thuê máy ảnh Long Khánh. Anh/chị cần tư vấn gì ạ?',
      this.graph.getDefaultQuickReplies(),
    );
  }
}
