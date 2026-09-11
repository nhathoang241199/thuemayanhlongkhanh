export type MessengerConfig = {
  enabled: boolean;
  learnMode: boolean;
  pageId: string;
  pageAccessToken: string;
  verifyToken: string;
  appSecret: string;
  adminPsid: string;
  frontendUrl: string;
  inactivityMs: number;
  aiServiceUrl: string;
  aiServiceToken: string;
};

const HANDOFF_DURATION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INACTIVITY_MS = 10_000;

export function getHandoffDurationMs(): number {
  return HANDOFF_DURATION_MS;
}

export function getMessengerConfig(): MessengerConfig {
  const inactivityRaw = Number(process.env.MESSENGER_INACTIVITY_MS);
  const inactivityMs =
    Number.isFinite(inactivityRaw) && inactivityRaw >= 0
      ? inactivityRaw
      : DEFAULT_INACTIVITY_MS;

  return {
    enabled: process.env.MESSENGER_BOT_ENABLED !== 'false',
    learnMode: process.env.MESSENGER_LEARN_MODE === 'true',
    pageId: process.env.FACEBOOK_PAGE_ID?.trim() ?? '',
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ?? '',
    verifyToken: process.env.FACEBOOK_VERIFY_TOKEN?.trim() ?? '',
    appSecret: process.env.FACEBOOK_APP_SECRET?.trim() ?? '',
    adminPsid: process.env.ADMIN_MESSENGER_PSID?.trim() ?? '',
    frontendUrl:
      process.env.FRONTEND_URL?.trim() ??
      process.env.FRONTEND_ORIGIN?.trim() ??
      'https://thuemayanhlongkhanh.com',
    inactivityMs,
    aiServiceUrl:
      process.env.AI_SERVICE_URL?.trim() ?? 'http://localhost:8000',
    aiServiceToken: process.env.AI_SERVICE_TOKEN?.trim() ?? 'dev-secret',
  };
}

/** Webhook nhận tin (bot tắt hoặc chế độ học vẫn cần token Meta). */
export function isMessengerWebhookConfigured(
  config = getMessengerConfig(),
): boolean {
  return Boolean(
    (config.enabled || config.learnMode) &&
      config.pageAccessToken &&
      config.verifyToken,
  );
}

/** Bot tự trả lời khách (không bao gồm chế độ học). */
export function isMessengerBotEnabled(config = getMessengerConfig()): boolean {
  return Boolean(
    config.enabled &&
      !config.learnMode &&
      config.pageAccessToken &&
      config.verifyToken &&
      config.aiServiceUrl,
  );
}

/** @deprecated Dùng isMessengerWebhookConfigured / isMessengerBotEnabled */
export function isMessengerConfigured(config = getMessengerConfig()): boolean {
  return isMessengerBotEnabled(config);
}
