/** Giới hạn reply Messenger: tối đa 2 câu, ~180 ký tự. */
export function truncateMessengerReply(
  text: string,
  maxSentences = 2,
  maxChars = 180,
): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const sentences = trimmed.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [trimmed];
  let result = sentences.slice(0, maxSentences).join('').trim();
  if (result.length > maxChars) {
    result = result.slice(0, maxChars).replace(/\s+\S*$/, '').trim();
    if (!/[.!?…]$/.test(result)) result += '…';
  }
  return result;
}
