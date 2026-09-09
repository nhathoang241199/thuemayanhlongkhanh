-- CreateTable
CREATE TABLE "ShipperPushSubscription" (
    "id" TEXT NOT NULL,
    "shipperId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipperPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShipperPushSubscription_endpoint_key" ON "ShipperPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "ShipperPushSubscription_shipperId_idx" ON "ShipperPushSubscription"("shipperId");

-- AddForeignKey
ALTER TABLE "ShipperPushSubscription" ADD CONSTRAINT "ShipperPushSubscription_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
