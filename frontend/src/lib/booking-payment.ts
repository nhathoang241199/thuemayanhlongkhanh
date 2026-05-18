export const BOOKING_DEPOSIT_VND = 50_000;
export const BOOKING_CANCEL_REFUND_VND = 40_000;
export const CANCEL_REFUND_MIN_MS_BEFORE_PICKUP = 24 * 60 * 60 * 1000;

export function balanceDueVnd(totalAmount: number): number {
  return Math.max(0, totalAmount - BOOKING_DEPOSIT_VND);
}

export function isCancelRefundEligible(
  pickupAt: string | Date,
  now = new Date(),
): boolean {
  const pickup =
    typeof pickupAt === 'string' ? new Date(pickupAt) : pickupAt;
  return (
    now.getTime() < pickup.getTime() - CANCEL_REFUND_MIN_MS_BEFORE_PICKUP
  );
}
