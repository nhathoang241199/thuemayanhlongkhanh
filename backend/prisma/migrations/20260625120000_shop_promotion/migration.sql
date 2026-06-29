-- CreateTable
CREATE TABLE "ShopPromotion" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE,
    "endDate" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPromotion_pkey" PRIMARY KEY ("id")
);

-- Seed singleton row
INSERT INTO "ShopPromotion" ("id", "discountPercent", "updatedAt")
VALUES ('singleton', 0, CURRENT_TIMESTAMP);
