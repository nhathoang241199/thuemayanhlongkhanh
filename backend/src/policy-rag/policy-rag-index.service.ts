import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { embeddingToSql } from './embedding-to-sql.util';
import {
  embedTextForChunk,
  parsePolicyChunks,
} from './policy-chunk.parser';
import { PolicyRagEmbeddingService } from './policy-rag-embedding.service';
import { isPolicyRagConfigured } from './policy-rag.config';
import {
  BOOKING_TERMS_SOURCE_ID,
  type PolicyChunkRow,
} from './policy-rag.types';

const SINGLETON_BOOKING_TERMS_ID = 'singleton';

@Injectable()
export class PolicyRagIndexService implements OnModuleInit {
  private readonly logger = new Logger(PolicyRagIndexService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: PolicyRagEmbeddingService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!isPolicyRagConfigured()) return;

    try {
      const count = await this.countChunks(BOOKING_TERMS_SOURCE_ID);
      if (count > 0) return;

      const row = await this.prisma.bookingTerms.findUnique({
        where: { id: SINGLETON_BOOKING_TERMS_ID },
      });
      if (!row?.content?.trim()) return;

      this.logger.log('Bootstrap Policy RAG index từ BookingTerms hiện có');
      await this.reindex(BOOKING_TERMS_SOURCE_ID, row.content);
    } catch (err) {
      this.logger.warn(
        'Bootstrap Policy RAG thất bại — kiểm tra pgvector migration',
        err instanceof Error ? err.message : err,
      );
    }
  }

  async countChunks(sourceId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "PolicyChunk"
      WHERE "sourceId" = ${sourceId}
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async listChunks(sourceId: string): Promise<PolicyChunkRow[]> {
    return this.prisma.$queryRaw<PolicyChunkRow[]>`
      SELECT
        "id",
        "sourceId",
        "section",
        "chunkIndex",
        "content",
        "createdAt"
      FROM "PolicyChunk"
      WHERE "sourceId" = ${sourceId}
      ORDER BY "chunkIndex" ASC
    `;
  }

  async latestIndexedAt(sourceId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ latest: Date | null }[]>`
      SELECT MAX("createdAt") AS latest
      FROM "PolicyChunk"
      WHERE "sourceId" = ${sourceId}
    `;
    const latest = rows[0]?.latest;
    return latest ? new Date(latest).toISOString() : null;
  }

  async reindexBookingTerms(content: string): Promise<void> {
    await this.reindex(BOOKING_TERMS_SOURCE_ID, content);
  }

  async reindexFromDbBookingTerms(): Promise<number> {
    const row = await this.prisma.bookingTerms.findUnique({
      where: { id: SINGLETON_BOOKING_TERMS_ID },
    });
    await this.reindexBookingTerms(row?.content ?? '');
    return this.countChunks(BOOKING_TERMS_SOURCE_ID);
  }

  async reindex(sourceId: string, content: string): Promise<void> {
    if (!isPolicyRagConfigured()) {
      this.logger.debug('Policy RAG tắt — bỏ qua reindex');
      return;
    }

    const trimmed = content.trim();
    await this.prisma.$executeRaw`
      DELETE FROM "PolicyChunk" WHERE "sourceId" = ${sourceId}
    `;

    if (!trimmed) {
      this.logger.log(`Policy RAG: xóa index sourceId=${sourceId} (content rỗng)`);
      return;
    }

    const parsed = parsePolicyChunks(trimmed);
    if (!parsed.length) return;

    const embedInputs = parsed.map((chunk) =>
      embedTextForChunk(chunk.section, chunk.content),
    );
    const vectors = await this.embedding.embed(embedInputs);

    for (let i = 0; i < parsed.length; i += 1) {
      const chunk = parsed[i];
      const vector = vectors[i];
      const id = `${sourceId}-${chunk.chunkIndex}`;
      const embeddingSql = embeddingToSql(vector);

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "PolicyChunk" ("id", "sourceId", "section", "chunkIndex", "content", "embedding")
         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        id,
        sourceId,
        chunk.section,
        chunk.chunkIndex,
        chunk.content,
        embeddingSql,
      );
    }

    this.logger.log(
      `Policy RAG: indexed ${parsed.length} chunk(s) sourceId=${sourceId}`,
    );
  }
}
