-- CreateEnum
CREATE TYPE "CustomerTag" AS ENUM ('NORMAL', 'FRIENDLY', 'VIP', 'UNFRIENDLY', 'BLACKLISTED');

-- Legacy rows cannot satisfy new NOT NULL / unique columns; safe for empty dev DB.
DELETE FROM "Booking";
DELETE FROM "Customer";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "customerTag" "CustomerTag" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "verificationImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
