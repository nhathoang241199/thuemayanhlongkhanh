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
];
