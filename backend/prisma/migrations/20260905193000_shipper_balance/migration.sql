-- Shipper balance + withdrawal log
ALTER TABLE "Shipper" ADD COLUMN "balanceVnd" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ShipperWithdrawal" (
    "id" TEXT NOT NULL,
    "shipperId" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipperWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShipperWithdrawal_shipperId_createdAt_idx" ON "ShipperWithdrawal"("shipperId", "createdAt");

ALTER TABLE "ShipperWithdrawal" ADD CONSTRAINT "ShipperWithdrawal_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
