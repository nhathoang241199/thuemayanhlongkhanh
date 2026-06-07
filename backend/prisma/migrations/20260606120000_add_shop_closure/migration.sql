-- CreateTable
CREATE TABLE "ShopClosure" (
    "id" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopClosure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopClosure_startDate_endDate_idx" ON "ShopClosure"("startDate", "endDate");
