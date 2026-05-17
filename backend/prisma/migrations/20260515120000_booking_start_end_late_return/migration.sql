-- Rename bookingDate to startBookingDate
ALTER TABLE "Booking" RENAME COLUMN "bookingDate" TO "startBookingDate";

-- Add endBookingDate and backfill from slot
ALTER TABLE "Booking" ADD COLUMN "endBookingDate" TIMESTAMP(3);

UPDATE "Booking" SET "endBookingDate" = CASE "slot"
  WHEN 'MORNING'    THEN "startBookingDate" + interval '5 hours'
  WHEN 'AFTERNOON'  THEN "startBookingDate" + interval '5 hours'
  WHEN 'EVENING'    THEN "startBookingDate" + interval '4 hours'
  WHEN 'FULL_DAY'   THEN "startBookingDate" + interval '1 day'
END;

ALTER TABLE "Booking" ALTER COLUMN "endBookingDate" SET NOT NULL;

-- New booking status
ALTER TYPE "BookingStatus" ADD VALUE 'LATE_RETURN';

-- Recreate index for renamed column
DROP INDEX IF EXISTS "Booking_cameraId_bookingDate_idx";
CREATE INDEX "Booking_cameraId_startBookingDate_idx" ON "Booking"("cameraId", "startBookingDate");
