-- CreateTable
CREATE TABLE "ShopFeatures" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "printEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopFeatures_pkey" PRIMARY KEY ("id")
);
