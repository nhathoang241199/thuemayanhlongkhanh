import type { PolicyChunkParsed } from './policy-rag.types';

const BULLET_PREFIX = '- ';

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(BULLET_PREFIX)) return false;
  if (!/[\p{L}]/u.test(trimmed)) return false;
  // Section IN HOA: không có chữ thường (Unicode Ll)
  return !/\p{Ll}/u.test(trimmed);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Parse chính sách: dòng IN HOA = section; dòng `- ` = chunk. */
export function parsePolicyChunks(text: string): PolicyChunkParsed[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  let currentSection: string | null = null;
  const chunks: PolicyChunkParsed[] = [];
  let chunkIndex = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (isSectionHeader(line)) {
      currentSection = line;
      continue;
    }

    if (line.startsWith(BULLET_PREFIX)) {
      chunks.push({
        section: currentSection,
        content: line.slice(BULLET_PREFIX.length).trim(),
        chunkIndex: chunkIndex++,
      });
    }
  }

  if (chunks.length > 0) return chunks;

  const paragraphs = splitParagraphs(normalized);
  if (paragraphs.length <= 1) {
    return [{ section: null, content: normalized, chunkIndex: 0 }];
  }

  return paragraphs.map((content, index) => ({
    section: null,
    content,
    chunkIndex: index,
  }));
}

export function embedTextForChunk(section: string | null, content: string): string {
  if (section) return `${section}: ${content}`;
  return content;
}
