-- AlterTable
ALTER TABLE "Shipper" ADD COLUMN "payoutQrUrl" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ShopInfo" DROP COLUMN "payoutQrUrl";
