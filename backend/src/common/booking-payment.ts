export const BOOKING_DEPOSIT_VND = 50_000;
export const BOOKING_CANCEL_REFUND_VND = 40_000;
export const CANCEL_REFUND_MIN_MS_BEFORE_PICKUP = 24 * 60 * 60 * 1000;

export function balanceDueVnd(totalAmount: number): number {
  return Math.max(0, totalAmount - BOOKING_DEPOSIT_VND);
}

/** Hủy trước giờ lấy máy hơn 24 giờ → đủ điều kiện hoàn 40k cọc. */
export function isCancelRefundEligible(
  pickupAt: Date,
  now = new Date(),
): boolean {
  return now.getTime() < pickupAt.getTime() - CANCEL_REFUND_MIN_MS_BEFORE_PICKUP;
}
