-- CreateTable
CREATE TABLE "ShopInfo" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "mapUrl" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopInfo_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ShopInfo" ("id", "phone", "address", "mapUrl", "updatedAt")
VALUES ('singleton', '', '', '', CURRENT_TIMESTAMP);
