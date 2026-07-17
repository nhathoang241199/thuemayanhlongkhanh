import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { embeddingToSql } from './embedding-to-sql.util';
import { PolicyRagEmbeddingService } from './policy-rag-embedding.service';
import { getPolicyRagConfig, isPolicyRagConfigured } from './policy-rag.config';
import type { PolicyChunkHit } from './policy-rag.types';

type RawHit = {
  section: string | null;
  content: string;
  score: number;
};

@Injectable()
export class PolicyRagRetrieveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: PolicyRagEmbeddingService,
  ) {}

  async search(
    sourceId: string,
    query: string,
    topK?: number,
  ): Promise<PolicyChunkHit[]> {
    if (!isPolicyRagConfigured()) return [];

    const trimmed = query.trim();
    if (!trimmed) return [];

    const config = getPolicyRagConfig();
    const limit = topK ?? config.topK;
    const queryVector = await this.embedding.embedOne(trimmed);
    const embeddingSql = embeddingToSql(queryVector);

    const rows = await this.prisma.$queryRawUnsafe<RawHit[]>(
      `SELECT
         "section",
         "content",
         ("embedding" <=> $1::vector) AS score
       FROM "PolicyChunk"
       WHERE "sourceId" = $2
       ORDER BY score ASC
       LIMIT $3`,
      embeddingSql,
      sourceId,
      limit,
    );

    return rows.map((row) => ({
      section: row.section,
      content: row.content,
      score: Number(row.score),
    }));
  }

  formatHitsForTool(hits: PolicyChunkHit[]): string {
    if (!hits.length) {
      return 'Không tìm thấy đoạn chính sách liên quan trong index RAG.';
    }

    return hits
      .map((hit, index) => {
        const heading = hit.section ? `[${hit.section}] ` : '';
        return `${index + 1}. ${heading}${hit.content}`;
      })
      .join('\n');
  }
}
