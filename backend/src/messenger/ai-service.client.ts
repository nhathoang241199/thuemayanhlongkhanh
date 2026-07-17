import { Injectable, Logger } from '@nestjs/common';
import { getMessengerConfig } from './messenger.config';

export type AiChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiChatResponse = {
  reply: string;
  reply_raw?: string;
  canned?: boolean;
  intent?: string;
  graph_trace?: string[];
  rounds?: unknown[];
};

const FALLBACK_REPLY =
  'Em cần nhờ admin xác nhận thêm — anh/chị gõ AD để gặp tư vấn viên nhé.';

@Injectable()
export class AiServiceClient {
  private readonly logger = new Logger(AiServiceClient.name);

  async chat(
    userMessage: string,
    history: AiChatTurn[],
    frontendUrl: string,
    psid?: string,
  ): Promise<AiChatResponse> {
    const config = getMessengerConfig();
    const url = `${config.aiServiceUrl.replace(/\/$/, '')}/v1/chat`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': config.aiServiceToken,
        },
        body: JSON.stringify({
          user_message: userMessage,
          history,
          context: { frontend_url: frontendUrl, psid },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`AI service ${res.status}: ${text}`);
        return { reply: FALLBACK_REPLY };
      }

      const data = (await res.json()) as AiChatResponse;
      return {
        reply: data.reply?.trim() || FALLBACK_REPLY,
        reply_raw: data.reply_raw,
        canned: data.canned,
        intent: data.intent,
        graph_trace: data.graph_trace,
        rounds: data.rounds,
      };
    } catch (err) {
      this.logger.error('AI service call failed', err);
      return { reply: FALLBACK_REPLY };
    } finally {
      clearTimeout(timeout);
    }
  }
}
