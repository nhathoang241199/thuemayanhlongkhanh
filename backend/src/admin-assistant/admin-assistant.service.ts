import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages/messages.mjs';
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { todayCalendarDayVN } from '../common/booking-schedule';
import {
  getAdminAssistantConfig,
  isAdminAssistantConfigured,
} from './admin-assistant.config';
import { AdminAssistantToolsService } from './admin-assistant-tools.service';

const MAX_TOOL_ROUNDS = 6;

@Injectable()
export class AdminAssistantService {
  private readonly logger = new Logger(AdminAssistantService.name);
  private client: Anthropic | null = null;

  constructor(private readonly tools: AdminAssistantToolsService) {}

  private getClient(): Anthropic {
    if (!this.client) {
      const { anthropicApiKey } = getAdminAssistantConfig();
      this.client = new Anthropic({ apiKey: anthropicApiKey });
    }
    return this.client;
  }

  private readSystemPromptBase(): string {
    return readFileSync(
      join(__dirname, 'data', 'prompts', 'system.md'),
      'utf8',
    );
  }

  private buildSystemPrompt(): string {
    const today = todayCalendarDayVN();
    const [year, month] = today.split('-').map(Number);
    return `${this.readSystemPromptBase()}

## Ngày hiện tại (VN)
- Hôm nay: ${today}
- Tháng này: ${month}/${year}
- Năm nay: ${year}`;
  }

  assertConfigured(): void {
    if (!isAdminAssistantConfigured()) {
      throw new Error(
        'Trợ lý AI chưa bật hoặc thiếu ANTHROPIC_API_KEY. Kiểm tra backend/.env',
      );
    }
  }

  async chat(
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string> {
    this.assertConfigured();
    const config = getAdminAssistantConfig();

    const messages: MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const toolDefs = this.tools.getToolDefinitions();
    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds += 1;
      const response = await this.getClient().messages.create({
        model: config.anthropicModel,
        max_tokens: 1536,
        system: this.buildSystemPrompt(),
        tools: toolDefs,
        messages,
      });

      const toolUses = response.content.filter(
        (b): b is ToolUseBlock => b.type === 'tool_use',
      );
      const textBlocks = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('')
        .trim();

      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
        return (
          textBlocks ||
          'Mình chưa hiểu câu hỏi — bạn thử hỏi cụ thể hơn (vd. tháng/năm) nhé.'
        );
      }

      messages.push({ role: 'assistant', content: response.content });

      const toolResults: ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const result = await this.tools.executeTool(
          toolUse.name,
          (toolUse.input ?? {}) as Record<string, unknown>,
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }
      messages.push({ role: 'user', content: toolResults });
    }

    this.logger.warn('Admin assistant max tool rounds reached');
    return 'Câu hỏi hơi phức tạp — bạn thử chia nhỏ (vd. hỏi từng tháng) nhé.';
  }
}
