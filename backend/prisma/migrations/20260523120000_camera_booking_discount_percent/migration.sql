-- AlterTable
ALTER TABLE "Camera" ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0;
