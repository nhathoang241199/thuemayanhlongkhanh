-- Shipper accounts + ShipOrder (replace Grab DeliveryShipment)

CREATE TABLE "Shipper" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipper_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Shipper_phone_key" ON "Shipper"("phone");

-- Migrate DeliveryShipment -> ShipOrder if old table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'DeliveryShipment'
  ) THEN
    CREATE TABLE "ShipOrder" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "bookingCode" TEXT NOT NULL DEFAULT '',
        "leg" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "customerName" TEXT NOT NULL DEFAULT '',
        "customerPhone" TEXT NOT NULL DEFAULT '',
        "address" TEXT NOT NULL DEFAULT '',
        "shipperId" TEXT,
        "claimedAt" TIMESTAMP(3),
        "completedAt" TIMESTAMP(3),
        "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "ShipOrder_pkey" PRIMARY KEY ("id")
    );

    INSERT INTO "ShipOrder" (
        "id", "bookingId", "bookingCode", "leg", "status",
        "customerName", "customerPhone", "address",
        "requestedAt", "updatedAt", "completedAt"
    )
    SELECT
        ds."id",
        ds."bookingId",
        COALESCE(b."bookingCode", ''),
        ds."leg",
        CASE ds."status"
            WHEN 'DELIVERED' THEN 'COMPLETED'
            WHEN 'FAILED' THEN 'CANCELLED'
            WHEN 'CANCELLED' THEN 'CANCELLED'
            WHEN 'REQUESTED' THEN 'PENDING'
            WHEN 'DISPATCHED' THEN 'CLAIMED'
            WHEN 'PICKED_UP' THEN 'CLAIMED'
            ELSE 'PENDING'
        END,
        COALESCE(c."name", ''),
        COALESCE(c."phone", ''),
        COALESCE(ds."destinationAddress", ds."originAddress", ''),
        ds."requestedAt",
        ds."updatedAt",
        ds."completedAt"
    FROM "DeliveryShipment" ds
    LEFT JOIN "Booking" b ON b."id" = ds."bookingId"
    LEFT JOIN "Customer" c ON c."id" = b."customerId";

    DROP TABLE "DeliveryShipment";
  ELSE
    CREATE TABLE "ShipOrder" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "bookingCode" TEXT NOT NULL,
        "leg" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "customerName" TEXT NOT NULL,
        "customerPhone" TEXT NOT NULL,
        "address" TEXT NOT NULL,
        "shipperId" TEXT,
        "claimedAt" TIMESTAMP(3),
        "completedAt" TIMESTAMP(3),
        "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "ShipOrder_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ShipOrder_bookingId_leg_key" ON "ShipOrder"("bookingId", "leg");
CREATE INDEX IF NOT EXISTS "ShipOrder_status_requestedAt_idx" ON "ShipOrder"("status", "requestedAt");
CREATE INDEX IF NOT EXISTS "ShipOrder_shipperId_status_idx" ON "ShipOrder"("shipperId", "status");

ALTER TABLE "ShipOrder" DROP CONSTRAINT IF EXISTS "ShipOrder_bookingId_fkey";
ALTER TABLE "ShipOrder" ADD CONSTRAINT "ShipOrder_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShipOrder" DROP CONSTRAINT IF EXISTS "ShipOrder_shipperId_fkey";
ALTER TABLE "ShipOrder" ADD CONSTRAINT "ShipOrder_shipperId_fkey"
    FOREIGN KEY ("shipperId") REFERENCES "Shipper"("id") ON DELETE SET NULL ON UPDATE CASCADE;
