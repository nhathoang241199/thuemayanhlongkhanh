import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacebookGraphService } from './facebook-graph.service';
import { getMessengerConfig } from './messenger.config';

const MESSAGE_JOIN = '\n---\n';
const REPLY_ROLES = ['owner', 'assistant'] as const;

export type LearnExampleStatus = 'pending' | 'approved' | 'rejected';

@Injectable()
export class MessengerLearnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: FacebookGraphService,
  ) {}

  getStatus() {
    const config = getMessengerConfig();
    return {
      learnMode: config.learnMode,
      botEnabled: config.enabled && !config.learnMode,
      webhookConfigured: Boolean(
        (config.enabled || config.learnMode) &&
          config.pageAccessToken &&
          config.verifyToken,
      ),
    };
  }

  async ensureConversation(psid: string) {
    return this.prisma.messengerConversation.upsert({
      where: { psid },
      create: { psid },
      update: {},
    });
  }

  async saveUserTurn(conversationId: string, text: string): Promise<void> {
    await this.saveMessage(conversationId, 'user', text);
  }

  async recordOwnerReply(psid: string, replyText: string): Promise<void> {
    const trimmed = replyText.trim();
    if (!trimmed) return;

    const conversation = await this.ensureConversation(psid);
    const userMessage = await this.collectUnpairedUserMessage(conversation.id);
    await this.saveMessage(conversation.id, 'owner', trimmed);

    if (!userMessage) return;

    await this.prisma.messengerLearnExample.create({
      data: {
        conversationId: conversation.id,
        userMessage,
        ownerReply: trimmed,
        status: 'pending',
      },
    });
  }

  /** Tin khách chưa ghép cặp kể từ lần shop/bot trả lời gần nhất. */
  async collectUnpairedUserMessage(conversationId: string): Promise<string | null> {
    const lastReply = await this.prisma.messengerMessage.findFirst({
      where: {
        conversationId,
        role: { in: [...REPLY_ROLES] },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const userRows = await this.prisma.messengerMessage.findMany({
      where: {
        conversationId,
        role: 'user',
        ...(lastReply ? { createdAt: { gt: lastReply.createdAt } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    });

    if (!userRows.length) return null;
    return userRows.map((row) => row.content).join(MESSAGE_JOIN);
  }

  async listExamples(status?: LearnExampleStatus) {
    return this.prisma.messengerLearnExample.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        conversation: { select: { psid: true } },
      },
    });
  }

  async updateExample(
    id: string,
    data: { status?: LearnExampleStatus; note?: string | null },
  ) {
    try {
      return await this.prisma.messengerLearnExample.update({
        where: { id },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.note !== undefined ? { note: data.note } : {}),
        },
        include: {
          conversation: { select: { psid: true } },
        },
      });
    } catch {
      throw new NotFoundException('Không tìm thấy mẫu học');
    }
  }

  async completePendingManually(psid: string, ownerReply: string) {
    return this.recordOwnerReply(psid, ownerReply);
  }

  async syncFromGraph(psid: string): Promise<number> {
    const config = getMessengerConfig();
    const pageId = config.pageId;
    if (!pageId) {
      throw new Error('Thiếu FACEBOOK_PAGE_ID trong backend/.env');
    }

    const thread = await this.graph.fetchThreadMessages(pageId, psid);
    const conversation = await this.ensureConversation(psid);
    let created = 0;
    let userBuffer: string[] = [];
    let ownerBuffer: string[] = [];

    const flushPair = async () => {
      if (!userBuffer.length || !ownerBuffer.length) return;
      const userMessage = userBuffer.join(MESSAGE_JOIN);
      const ownerReply = ownerBuffer.join(MESSAGE_JOIN);
      userBuffer = [];
      ownerBuffer = [];

      const exists = await this.prisma.messengerLearnExample.findFirst({
        where: {
          conversationId: conversation.id,
          userMessage,
          ownerReply,
        },
      });
      if (exists) return;

      await this.saveMessage(conversation.id, 'owner', ownerReply);
      await this.prisma.messengerLearnExample.create({
        data: {
          conversationId: conversation.id,
          userMessage,
          ownerReply,
          status: 'pending',
        },
      });
      created += 1;
    };

    for (const msg of thread) {
      const isPage = msg.fromId === pageId;
      if (!isPage) {
        if (ownerBuffer.length) {
          await flushPair();
        }
        userBuffer.push(msg.text);
        continue;
      }
      ownerBuffer.push(msg.text);
    }

    await flushPair();
    return created;
  }

  async syncAllPendingFromGraph(): Promise<{ synced: number; psids: string[] }> {
    const pending = await this.listPendingTurns();
    const psids = [...new Set(pending.map((p) => p.psid))];
    let synced = 0;
    for (const psid of psids) {
      synced += await this.syncFromGraph(psid);
    }
    return { synced, psids };
  }

  async listPendingTurns() {
    const conversations = await this.prisma.messengerConversation.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, psid: true, updatedAt: true },
    });

    const pending: {
      psid: string;
      userMessage: string;
      updatedAt: Date;
    }[] = [];

    for (const conversation of conversations) {
      const userMessage = await this.collectUnpairedUserMessage(conversation.id);
      if (!userMessage) continue;
      pending.push({
        psid: conversation.psid,
        userMessage,
        updatedAt: conversation.updatedAt,
      });
    }

    return pending;
  }

  async stats() {
    const [pending, approved, rejected, total] = await Promise.all([
      this.prisma.messengerLearnExample.count({ where: { status: 'pending' } }),
      this.prisma.messengerLearnExample.count({ where: { status: 'approved' } }),
      this.prisma.messengerLearnExample.count({ where: { status: 'rejected' } }),
      this.prisma.messengerLearnExample.count(),
    ]);
    return { pending, approved, rejected, total };
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
}
