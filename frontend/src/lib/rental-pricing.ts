import type { BookingSlot } from "@/lib/booking-api";

/** Hệ số nhân trên giá ngày — đồng bộ backend booking-schedule.ts */
export function multiDayRentalMultiplier(dayCount: number): number {
  switch (dayCount) {
    case 1:
      return 1;
    case 2:
      return 1.75;
    case 3:
      return 2.4;
    case 4:
      return 3;
    case 5:
      return 3.5;
    default:
      return 0.65 * dayCount;
  }
}

/** Tiền thuê máy (VNĐ), chưa gồm phí giao. */
export function rentalAmountVnd(
  dayCount: number,
  dayPrice: number,
  shiftPrice: number,
  slot: BookingSlot,
): number {
  if (dayCount < 1) return 0;
  if (dayCount === 1 && slot !== "FULL_DAY") return shiftPrice;
  return Math.round(dayPrice * multiDayRentalMultiplier(dayCount));
}
