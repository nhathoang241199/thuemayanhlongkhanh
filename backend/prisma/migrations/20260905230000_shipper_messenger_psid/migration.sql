-- AlterTable
ALTER TABLE "Shipper" ADD COLUMN "messengerPsid" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Shipper_messengerPsid_idx" ON "Shipper"("messengerPsid");
