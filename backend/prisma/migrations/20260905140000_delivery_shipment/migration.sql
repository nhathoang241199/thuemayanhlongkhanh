-- AlterTable
ALTER TABLE "ShopInfo" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DeliveryShipment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "leg" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "provider" TEXT NOT NULL DEFAULT 'grab_express',
    "externalId" TEXT,
    "trackingUrl" TEXT,
    "originAddress" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION,
    "originLng" DOUBLE PRECISION,
    "destLat" DOUBLE PRECISION,
    "destLng" DOUBLE PRECISION,
    "quotedFeeVnd" INTEGER,
    "failureReason" TEXT,
    "rawPayload" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryShipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryShipment_bookingId_leg_key" ON "DeliveryShipment"("bookingId", "leg");

-- CreateIndex
CREATE INDEX "DeliveryShipment_status_requestedAt_idx" ON "DeliveryShipment"("status", "requestedAt");

-- AddForeignKey
ALTER TABLE "DeliveryShipment" ADD CONSTRAINT "DeliveryShipment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
