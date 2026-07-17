export type PolicyRagConfig = {
  enabled: boolean;
  openaiApiKey: string;
  openaiEmbeddingModel: string;
  topK: number;
  anthropicApiKey: string;
  anthropicModel: string;
};

export function getPolicyRagConfig(): PolicyRagConfig {
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim() ?? '';
  const enabledFlag = process.env.POLICY_RAG_ENABLED !== 'false';
  const topKRaw = Number(process.env.POLICY_RAG_TOP_K);

  return {
    enabled: enabledFlag && Boolean(openaiApiKey),
    openaiApiKey,
    openaiEmbeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL?.trim() ?? 'text-embedding-3-small',
    topK: Number.isFinite(topKRaw) && topKRaw > 0 ? topKRaw : 3,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() ?? '',
    anthropicModel:
      process.env.ANTHROPIC_MODEL?.trim() ?? 'claude-haiku-4-5',
  };
}

export function isPolicyRagConfigured(config = getPolicyRagConfig()): boolean {
  return config.enabled;
}

export function isPolicyRagAskConfigured(
  config = getPolicyRagConfig(),
): boolean {
  return config.enabled && Boolean(config.anthropicApiKey);
}
