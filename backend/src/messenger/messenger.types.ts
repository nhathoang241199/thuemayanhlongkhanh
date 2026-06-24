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
