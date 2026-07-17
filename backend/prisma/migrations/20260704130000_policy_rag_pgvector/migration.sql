CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "PolicyChunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT 'booking-terms',
    "section" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PolicyChunk_sourceId_idx" ON "PolicyChunk"("sourceId");

CREATE INDEX "PolicyChunk_embedding_hnsw_idx"
    ON "PolicyChunk" USING hnsw ("embedding" vector_cosine_ops);
