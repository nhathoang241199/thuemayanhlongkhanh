import { Injectable, Logger } from '@nestjs/common';
import { getMessengerConfig } from './messenger.config';
import type { QuickReplyOption } from './messenger.types';

const GRAPH = 'https://graph.facebook.com/v21.0/me';

@Injectable()
export class FacebookGraphService {
  private readonly logger = new Logger(FacebookGraphService.name);

  private get token() {
    return getMessengerConfig().pageAccessToken;
  }

  private async postMessages(body: Record<string, unknown>) {
    const res = await fetch(`${GRAPH}/messages?access_token=${this.token}`, {
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
}
