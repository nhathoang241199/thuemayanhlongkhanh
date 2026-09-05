export type MessengerWebhookEntry = {
  id: string;
  time: number;
  messaging?: MessengerMessagingEvent[];
};

export type MessengerMessagingEvent = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload: string };
  };
  postback?: {
    title: string;
    payload: string;
  };
};

export type MessengerWebhookBody = {
  object: string;
  entry?: MessengerWebhookEntry[];
};

export type QuickReplyOption = {
  title: string;
  payload: string;
};

export const MENU_PAYLOADS = {
  PRICES: 'MENU_PRICES',
  AVAILABILITY: 'MENU_AVAILABILITY',
  TERMS: 'MENU_TERMS',
  ADMIN: 'MENU_ADMIN',
} as const;

export const ESCALATE_KEYWORDS = [
  'ad',
  'admin',
  'tư vấn',
  'tu van',
  'nhân viên',
  'nhan vien',
] as const;

/** Khách gõ để bật lại AI sau khi đã chuyển admin (nhầm hoặc xong việc với admin). */
export const RESET_BOT_KEYWORDS = ['bot', 'bot lại', 'bot lai'] as const;

const SHIP_LINK_RE =
  /^\s*ship\s*[:\-]?\s*(\+?\d[\d\s.\-]{8,20})\s*$/i;
const SHIP_UNLINK_RE = /^\s*huy\s+ship\s*$/i;

function stripVnDiacritics(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

export function parseShipMessengerLink(
  text: string,
): { action: 'link'; phone: string } | { action: 'unlink' } | null {
  const trimmed = text.trim();
  const plain = stripVnDiacritics(trimmed);
  if (SHIP_UNLINK_RE.test(plain)) {
    return { action: 'unlink' };
  }
  const match = SHIP_LINK_RE.exec(trimmed);
  if (!match?.[1]) return null;
  return { action: 'link', phone: match[1] };
}

export function matchesEscalateKeyword(text: string, keyword: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower === keyword) return true;
  // "ad" chỉ khớp từ đứng riêng — tránh false positive trong câu dài
  if (keyword === 'ad') {
    return /(?:^|[\s,.!?;:])ad(?:$|[\s,.!?;:])/i.test(lower);
  }
  return lower.includes(keyword);
}

export function shouldResetBot(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return RESET_BOT_KEYWORDS.some((kw) => lower === kw);
}
