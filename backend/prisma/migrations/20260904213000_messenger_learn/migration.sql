-- CreateTable
CREATE TABLE "MessengerLearnExample" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "ownerReply" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessengerLearnExample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessengerLearnExample_status_createdAt_idx" ON "MessengerLearnExample"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MessengerLearnExample_conversationId_createdAt_idx" ON "MessengerLearnExample"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "MessengerLearnExample" ADD CONSTRAINT "MessengerLearnExample_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MessengerConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
