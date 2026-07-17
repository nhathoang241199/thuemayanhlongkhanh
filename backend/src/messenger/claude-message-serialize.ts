import type { MessageParam } from '@anthropic-ai/sdk/resources/messages/messages.mjs';

function serializeContentBlock(block: unknown): unknown {
  if (!block || typeof block !== 'object') return block;
  const b = block as Record<string, unknown>;
  if (b.type === 'tool_use') {
    return {
      type: 'tool_use',
      id: b.id,
      name: b.name,
      input: b.input ?? {},
    };
  }
  if (b.type === 'tool_result') {
    return {
      type: 'tool_result',
      tool_use_id: b.tool_use_id,
      content: b.content,
    };
  }
  if (b.type === 'text') {
    return { type: 'text', text: b.text };
  }
  return block;
}

export function serializeMessageParam(
  msg: MessageParam,
): { role: string; content: unknown } {
  const content =
    typeof msg.content === 'string'
      ? msg.content
      : msg.content.map(serializeContentBlock);
  return { role: msg.role, content };
}

export function serializeMessageParams(
  messages: MessageParam[],
): { role: string; content: unknown }[] {
  return messages.map(serializeMessageParam);
}
