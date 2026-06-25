export type MessengerConfig = {
  enabled: boolean;
  pageAccessToken: string;
  verifyToken: string;
  appSecret: string;
  anthropicApiKey: string;
  anthropicModel: string;
  adminPsid: string;
  frontendUrl: string;
  inactivityMs: number;
};

const HANDOFF_DURATION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INACTIVITY_MS = 30_000;

export function getHandoffDurationMs(): number {
  return HANDOFF_DURATION_MS;
}

export function getMessengerConfig(): MessengerConfig {
  const inactivityRaw = Number(process.env.MESSENGER_INACTIVITY_MS);
  const inactivityMs =
    Number.isFinite(inactivityRaw) && inactivityRaw > 0
      ? inactivityRaw
      : DEFAULT_INACTIVITY_MS;

  return {
    enabled: process.env.MESSENGER_BOT_ENABLED !== 'false',
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ?? '',
    verifyToken: process.env.FACEBOOK_VERIFY_TOKEN?.trim() ?? '',
    appSecret: process.env.FACEBOOK_APP_SECRET?.trim() ?? '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() ?? '',
    anthropicModel:
      process.env.ANTHROPIC_MODEL?.trim() ?? 'claude-sonnet-4-6',
    adminPsid: process.env.ADMIN_MESSENGER_PSID?.trim() ?? '',
    frontendUrl:
      process.env.FRONTEND_URL?.trim() ??
      process.env.FRONTEND_ORIGIN?.trim() ??
      'https://thuemayanhlongkhanh.com',
    inactivityMs,
  };
}

export function isMessengerConfigured(config = getMessengerConfig()): boolean {
  return Boolean(
    config.enabled &&
      config.pageAccessToken &&
      config.verifyToken &&
      config.anthropicApiKey,
  );
}
