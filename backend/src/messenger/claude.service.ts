import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages/messages.mjs';
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getMessengerConfig } from './messenger.config';
import { MessengerToolsService } from './messenger-tools.service';

const MAX_TOOL_ROUNDS = 5;

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private client: Anthropic | null = null;

  constructor(private readonly tools: MessengerToolsService) {}

  private getClient(): Anthropic {
    if (!this.client) {
      const { anthropicApiKey } = getMessengerConfig();
      this.client = new Anthropic({ apiKey: anthropicApiKey });
    }
    return this.client;
  }

  private readDataFile(...parts: string[]): string {
    return readFileSync(join(__dirname, 'data', ...parts), 'utf8');
  }

  private buildSystemPrompt(bookUrl: string): string {
    const system = this.readDataFile('prompts', 'system.md');
    const faq = this.readDataFile('faq.md');
    return `${system}\n\n## FAQ bổ sung\n${faq}\n\n## Link đặt lịch\n${bookUrl}/book`;
  }

  async reply(
    history: { role: 'user' | 'assistant'; content: string }[],
    bookUrl: string,
  ): Promise<string> {
    const config = getMessengerConfig();
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
        max_tokens: 400,
        system: this.buildSystemPrompt(bookUrl),
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
        return textBlocks || 'Mình chưa rõ câu hỏi — bạn mô tả thêm giúp mình nhé?';
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

    this.logger.warn('Max tool rounds reached');
    return 'Mình cần nhờ admin xác nhận thêm — bạn gõ AD để gặp tư vấn viên nhé.';
  }
}
