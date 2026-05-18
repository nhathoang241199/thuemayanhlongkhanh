-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "pickupAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_pickupAt_idx" ON "Booking"("pickupAt");
