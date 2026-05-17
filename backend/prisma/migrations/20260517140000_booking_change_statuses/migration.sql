-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_REFUND_CANCEL';
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_REFUND_CHANGE';
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_CHANGE_PAYMENT';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "pendingChange" JSONB;

-- Đơn CANCELLED cũ (chờ hoàn từ luồng hủy trước) → chờ hoàn hủy lịch
UPDATE "Booking" SET status = 'PENDING_REFUND_CANCEL' WHERE status = 'CANCELLED';
