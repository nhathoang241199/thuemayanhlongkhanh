-- Rename VNPay-specific columns to provider-agnostic names
ALTER TABLE "Payment" RENAME COLUMN "vnpayTxnRef" TO "providerTxnRef";
ALTER TABLE "Payment" RENAME COLUMN "vnpayTransNo" TO "externalTransId";
