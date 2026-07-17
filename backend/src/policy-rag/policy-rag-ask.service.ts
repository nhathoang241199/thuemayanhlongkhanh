import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { buildMessengerSystemPrompt } from '../messenger/messenger-system-prompt';
import { getMessengerConfig } from '../messenger/messenger.config';
import { PolicyRagRetrieveService } from './policy-rag-retrieve.service';
import {
  getPolicyRagConfig,
  isPolicyRagAskConfigured,
} from './policy-rag.config';
import { BOOKING_TERMS_SOURCE_ID, type PolicyChunkHit } from './policy-rag.types';

/** Giống Messenger bot — tin ngắn fanpage. */
const ASK_MAX_TOKENS = 120;

export type PolicyRagAskPreview = {
  question: string;
  chunks: PolicyChunkHit[];
  model: string;
  maxTokens: number;
  system: string;
  userMessage: string;
  messages: { role: 'user'; content: string }[];
};

/** Body gửi `client.messages.create()` — Policy RAG ask (không có tools). */
export type ClaudeMessagesCreateBody = {
  model: string;
  max_tokens: number;
  system: string;
  messages: { role: 'user'; content: string }[];
};

export function toClaudeApiRequest(
  preview: PolicyRagAskPreview,
): ClaudeMessagesCreateBody {
  return {
    model: preview.model,
    max_tokens: preview.maxTokens,
    system: preview.system,
    messages: preview.messages,
  };
}

function buildUserMessage(question: string, chunks: PolicyChunkHit[]): string {
  const toolText = chunks
    .map((hit, i) => {
      const heading = hit.section ? `[${hit.section}] ` : '';
      return `${i + 1}. ${heading}${hit.content}`;
    })
    .join('\n');

  return `Khách hỏi: ${question}\n\nKết quả tool search_booking_policy:\n${toolText}`;
}

function buildSystemPrompt(): string {
  const { frontendUrl } = getMessengerConfig();
  return buildMessengerSystemPrompt(frontendUrl);
}

@Injectable()
export class PolicyRagAskService {
  private readonly logger = new Logger(PolicyRagAskService.name);
  private client: Anthropic | null = null;

  constructor(private readonly retrieve: PolicyRagRetrieveService) {}

  private getClient(): Anthropic {
    if (!this.client) {
      const { anthropicApiKey } = getPolicyRagConfig();
      this.client = new Anthropic({ apiKey: anthropicApiKey });
    }
    return this.client;
  }

  async previewAsk(question: string): Promise<PolicyRagAskPreview | null> {
    const trimmed = question.trim();
    if (!trimmed) return null;

    const chunks = await this.retrieve.search(
      BOOKING_TERMS_SOURCE_ID,
      trimmed,
    );
    if (!chunks.length) return null;

    const config = getPolicyRagConfig();
    const userMessage = buildUserMessage(trimmed, chunks);

    return {
      question: trimmed,
      chunks,
      model: config.anthropicModel,
      maxTokens: ASK_MAX_TOKENS,
      system: buildSystemPrompt(),
      userMessage,
      messages: [{ role: 'user', content: userMessage }],
    };
  }

  async ask(question: string): Promise<{ reply: string; chunks: PolicyChunkHit[] }> {
    if (!isPolicyRagAskConfigured()) {
      throw new Error(
        'Policy RAG chưa bật hoặc thiếu OPENAI_API_KEY / ANTHROPIC_API_KEY',
      );
    }

    const trimmed = question.trim();
    if (!trimmed) {
      return {
        reply: 'Em chưa rõ câu hỏi — anh/chị mô tả thêm giúp em nhé?',
        chunks: [],
      };
    }

    const preview = await this.previewAsk(trimmed);
    if (!preview) {
      return {
        reply:
          'Chưa có chunk chính sách — lưu điều khoản ở /admin/terms hoặc bấm Re-index.',
        chunks: [],
      };
    }

    const config = getPolicyRagConfig();
    const response = await this.getClient().messages.create({
      model: preview.model,
      max_tokens: preview.maxTokens,
      system: preview.system,
      messages: preview.messages,
    });

    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    if (!reply) {
      this.logger.warn('Claude trả về rỗng cho policy RAG ask');
      return {
        reply: 'Không tạo được câu trả lời — thử lại hoặc kiểm tra ANTHROPIC_API_KEY.',
        chunks: preview.chunks,
      };
    }

    return { reply, chunks: preview.chunks };
  }
}
