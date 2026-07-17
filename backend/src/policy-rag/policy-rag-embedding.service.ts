import { Injectable, Logger } from '@nestjs/common';
import { getPolicyRagConfig } from './policy-rag.config';

type OpenAiEmbeddingResponse = {
  data?: { embedding: number[]; index: number }[];
  error?: { message?: string };
};

@Injectable()
export class PolicyRagEmbeddingService {
  private readonly logger = new Logger(PolicyRagEmbeddingService.name);

  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];

    const config = getPolicyRagConfig();
    if (!config.openaiApiKey) {
      throw new Error('Thiếu OPENAI_API_KEY cho Policy RAG');
    }

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openaiEmbeddingModel,
        input: texts,
      }),
    });

    const body = (await res.json()) as OpenAiEmbeddingResponse;
    if (!res.ok) {
      const msg = body.error?.message ?? res.statusText;
      this.logger.error(`OpenAI embeddings ${res.status}: ${msg}`);
      throw new Error(`OpenAI embeddings: ${msg}`);
    }

    const rows = body.data ?? [];
    rows.sort((a, b) => a.index - b.index);
    return rows.map((row) => row.embedding);
  }

  async embedOne(text: string): Promise<number[]> {
    const [vector] = await this.embed([text]);
    return vector;
  }
}
