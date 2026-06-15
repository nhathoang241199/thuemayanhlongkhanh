import type { BookingSlot } from "@/lib/booking-api";

/** Bỏ bước chọn buổi trong wizard — mặc định `NEXT_PUBLIC_BOOKING_DEFAULT_SLOT` (thường FULL_DAY). */
export function isBookingSlotStepSkipped(): boolean {
  return process.env.NEXT_PUBLIC_BOOKING_SKIP_SLOT_STEP === "true";
}

const DEFAULT_SLOT: BookingSlot = "FULL_DAY";

/** Chính sách thuê strict (cọc thế chân, in hợp đồng mở rộng) — `NEXT_PUBLIC_BOOKING_POLICY_MODE=strict`. */
export function isStrictBookingPolicy(): boolean {
  return process.env.NEXT_PUBLIC_BOOKING_POLICY_MODE === "strict";
}

export function getDefaultBookingSlot(): BookingSlot {
  const raw = process.env.NEXT_PUBLIC_BOOKING_DEFAULT_SLOT?.trim();
  if (
    raw === "FULL_DAY" ||
    raw === "MORNING" ||
    raw === "AFTERNOON" ||
    raw === "EVENING"
  ) {
    return raw;
  }
  return DEFAULT_SLOT;
}
