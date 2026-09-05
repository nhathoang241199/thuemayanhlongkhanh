-- CreateTable
CREATE TABLE "FanpagePostDraft" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "publishPublic" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'hermes',
    "promotionNote" TEXT,
    "facebookPostId" TEXT,
    "rejectNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "FanpagePostDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FanpagePostDraft_status_createdAt_idx" ON "FanpagePostDraft"("status", "createdAt");
