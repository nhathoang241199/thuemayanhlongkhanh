import { Injectable, Logger } from '@nestjs/common';
import { getMessengerConfig } from './messenger.config';
import type { QuickReplyOption } from './messenger.types';

const GRAPH = 'https://graph.facebook.com/v21.0';

export type GraphThreadMessage = {
  id: string;
  text: string;
  fromId: string;
  createdTime: string;
};

@Injectable()
export class FacebookGraphService {
  private readonly logger = new Logger(FacebookGraphService.name);

  private get token() {
    return getMessengerConfig().pageAccessToken;
  }

  private async postMessages(body: Record<string, unknown>) {
    const res = await fetch(`${GRAPH}/me/messages?access_token=${this.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Graph API error ${res.status}: ${text}`);
      throw new Error(`Facebook Graph API: ${res.status}`);
    }
    return res.json();
  }

  async sendText(recipientId: string, text: string) {
    return this.postMessages({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE',
    });
  }

  /**
   * Gửi tin chủ động (thông báo đơn ship). Thử HUMAN_AGENT trước,
   * nếu fail thì thử RESPONSE (trong cửa sổ 24h).
   */
  async sendProactiveText(recipientId: string, text: string): Promise<void> {
    try {
      await this.postMessages({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'MESSAGE_TAG',
        tag: 'HUMAN_AGENT',
      });
      return;
    } catch (err) {
      this.logger.warn(
        `HUMAN_AGENT failed for ${recipientId}, retry RESPONSE: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    await this.postMessages({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE',
    });
  }

  async sendTextWithQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: QuickReplyOption[],
  ) {
    return this.postMessages({
      recipient: { id: recipientId },
      message: {
        text,
        quick_replies: quickReplies.map((q) => ({
          content_type: 'text',
          title: q.title,
          payload: q.payload,
        })),
      },
      messaging_type: 'RESPONSE',
    });
  }

  async sendTypingOn(recipientId: string) {
    return this.postMessages({
      recipient: { id: recipientId },
      sender_action: 'typing_on',
    });
  }

  getDefaultQuickReplies(): QuickReplyOption[] {
    return [
      { title: 'Xem giá máy', payload: 'MENU_PRICES' },
      { title: 'Check lịch trống', payload: 'MENU_AVAILABILITY' },
      { title: 'Quy định cọc', payload: 'MENU_TERMS' },
      { title: 'Gặp admin', payload: 'MENU_ADMIN' },
    ];
  }

  /** Đọc hội thoại Page ↔ khách (Inbox) — dùng khi message_echoes không gửi webhook. */
  async fetchThreadMessages(
    pageId: string,
    psid: string,
  ): Promise<GraphThreadMessage[]> {
    const url = new URL(`${GRAPH}/${pageId}/conversations`);
    url.searchParams.set('user_id', psid);
    url.searchParams.set('platform', 'messenger');
    url.searchParams.set(
      'fields',
      'messages{id,message,from,created_time}',
    );
    url.searchParams.set('access_token', this.token);

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Graph conversations ${res.status}: ${text}`);
      throw new Error(`Không đọc được hội thoại Facebook (${res.status})`);
    }

    const json = (await res.json()) as {
      data?: Array<{
        messages?: {
          data?: Array<{
            id?: string;
            message?: string;
            from?: { id?: string };
            created_time?: string;
          }>;
        };
      }>;
    };

    const raw = json.data?.[0]?.messages?.data ?? [];
    return raw
      .filter((m) => m.message?.trim() && m.from?.id && m.created_time && m.id)
      .map((m) => ({
        id: m.id!,
        text: m.message!.trim(),
        fromId: m.from!.id!,
        createdTime: m.created_time!,
      }))
      .sort(
        (a, b) =>
          new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime(),
      );
  }

  /** Đăng bài text (và link tuỳ chọn) lên fanpage. Cần quyền pages_manage_posts. */
  async publishPageFeedPost(
    pageId: string,
    message: string,
    link?: string,
    published = true,
  ): Promise<{ id: string; postUrl: string; published: boolean }> {
    const url = new URL(`${GRAPH}/${pageId}/feed`);
    url.searchParams.set('message', message);
    url.searchParams.set('access_token', this.token);
    url.searchParams.set('published', published ? 'true' : 'false');
    if (link?.trim()) {
      url.searchParams.set('link', link.trim());
    }

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Graph feed post ${res.status}: ${text}`);
      throw new Error(`Không đăng được bài fanpage (${res.status})`);
    }

    const json = (await res.json()) as { id?: string };
    const postId = json.id ?? '';
    const postUrl = postId
      ? published
        ? `https://www.facebook.com/${postId.replace('_', '/posts/')}`
        : ''
      : '';
    return { id: postId, postUrl, published };
  }
}
