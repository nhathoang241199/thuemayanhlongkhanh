/** Giới hạn reply Messenger: tối đa 2 câu, ~180 ký tự. */
export function truncateMessengerReply(
  text: string,
  maxSentences = 2,
  maxChars = 180,
): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const urlPlaceholders: string[] = [];
  const protectedText = trimmed.replace(/https?:\/\/[^\s]+/gi, (url) => {
    const token = `\x00URL${urlPlaceholders.length}\x00`;
    urlPlaceholders.push(url);
    return token;
  });

  const sentences =
    protectedText.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [protectedText];
  let result = sentences.slice(0, maxSentences).join('').trim();
  if (result.length > maxChars) {
    result = result.slice(0, maxChars).replace(/\s+\S*$/, '').trim();
    if (!/[.!?…]$/.test(result)) result += '…';
  }

  return urlPlaceholders.reduce(
    (s, url, i) => s.replace(`\x00URL${i}\x00`, url),
    result,
  );
}
