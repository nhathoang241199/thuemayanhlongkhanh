export type AdminAssistantConfig = {
  enabled: boolean;
  anthropicApiKey: string;
  anthropicModel: string;
};

export function getAdminAssistantConfig(): AdminAssistantConfig {
  return {
    enabled: process.env.ADMIN_ASSISTANT_ENABLED !== 'false',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() ?? '',
    anthropicModel:
      process.env.ANTHROPIC_MODEL?.trim() ?? 'claude-sonnet-4-20250514',
  };
}

export function isAdminAssistantConfigured(
  config = getAdminAssistantConfig(),
): boolean {
  return Boolean(config.enabled && config.anthropicApiKey);
}
