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

/** Phụ phí trả sáng hôm sau — đồng bộ backend. */
export const RETURN_NEXT_MORNING_SURCHARGE_RATIO = 0.5;

export function isReturnNextMorningEligible(slot: BookingSlot): boolean {
  return slot === "FULL_DAY" || slot === "EVENING";
}

export function returnNextMorningSurchargeVnd(dayPrice: number): number {
  return Math.round(dayPrice * RETURN_NEXT_MORNING_SURCHARGE_RATIO);
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

/** Tiền thuê gốc + phụ phí trả sáng hôm sau (chưa giảm %). */
export function rentalAmountWithOptionsVnd(
  dayCount: number,
  dayPrice: number,
  shiftPrice: number,
  slot: BookingSlot,
  returnNextMorning = false,
): number {
  const base = rentalAmountVnd(dayCount, dayPrice, shiftPrice, slot);
  if (!returnNextMorning || !isReturnNextMorningEligible(slot)) return base;
  return base + returnNextMorningSurchargeVnd(dayPrice);
}

export function clampDiscountPercent(discountPercent: number): number {
  if (!Number.isFinite(discountPercent)) return 0;
  return Math.min(100, Math.max(0, Math.trunc(discountPercent)));
}

export function discountedRentalVnd(
  rental: number,
  discountPercent: number,
): number {
  const pct = clampDiscountPercent(discountPercent);
  if (pct <= 0) return rental;
  return Math.round((rental * (100 - pct)) / 100);
}

export function bookingAmountVnd(
  rental: number,
  discountPercent: number,
  delivery: number,
): number {
  return discountedRentalVnd(rental, discountPercent) + delivery;
}
