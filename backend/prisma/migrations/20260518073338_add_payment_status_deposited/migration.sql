-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'DEPOSITED';

-- RenameIndex
ALTER INDEX "Payment_vnpayTxnRef_key" RENAME TO "Payment_providerTxnRef_key";
