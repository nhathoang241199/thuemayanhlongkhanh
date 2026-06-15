-- CreateEnum
CREATE TYPE "CollateralMethod" AS ENUM ('STUDENT_CARD_AND_CCCD', 'CCCD_AND_2M', 'HALF_VALUE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "contractCccd" TEXT,
ADD COLUMN "collateralMethod" "CollateralMethod",
ADD COLUMN "collateralImageUrl" TEXT;
