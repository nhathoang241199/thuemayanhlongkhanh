-- Migrate legacy rows before shrinking BookingStatus enum
UPDATE "Booking"
SET status = 'CANCELLED'
WHERE status::text IN (
  'REFUNDED',
  'PENDING_REFUND_CHANGE',
  'PENDING_CHANGE_PAYMENT'
);

CREATE TYPE "BookingStatus_new" AS ENUM (
  'PENDING_PAYMENT',
  'CONFIRMED',
  'RENTING',
  'LATE_RETURN',
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
