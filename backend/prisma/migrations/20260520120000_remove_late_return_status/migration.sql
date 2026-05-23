-- Gộp đơn trả trễ vào RENTING; bỏ giá trị enum LATE_RETURN
UPDATE "Booking"
SET status = 'RENTING'
WHERE status::text = 'LATE_RETURN';

CREATE TYPE "BookingStatus_new" AS ENUM (
  'PENDING_PAYMENT',
  'CONFIRMED',
  'RENTING',
  'COMPLETED',
  'PENDING_REFUND_CANCEL',
  'CANCELLED'
);

ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Booking"
  ALTER COLUMN "status" TYPE "BookingStatus_new"
  USING (status::text::"BookingStatus_new");

DROP TYPE "BookingStatus";

ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";

ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';
