import {
  BOOKING_CANCEL_REFUND_VND,
  BOOKING_DEPOSIT_VND,
  balanceDueVnd,
  isCancelRefundEligible,
} from './booking-payment';

describe('booking-payment', () => {
  it('balanceDueVnd subtracts deposit', () => {
    expect(balanceDueVnd(350_000)).toBe(300_000);
    expect(balanceDueVnd(40_000)).toBe(0);
  });

  it('isCancelRefundEligible when more than 24h before pickup', () => {
    const pickup = new Date('2026-06-01T00:00:00.000Z');
    const now = new Date(pickup.getTime() - 25 * 60 * 60 * 1000);
    expect(isCancelRefundEligible(pickup, now)).toBe(true);
  });

  it('isCancelRefundEligible false within 24h', () => {
    const pickup = new Date('2026-06-01T00:00:00.000Z');
    const now = new Date(pickup.getTime() - 23 * 60 * 60 * 1000);
    expect(isCancelRefundEligible(pickup, now)).toBe(false);
  });

  it('constants', () => {
    expect(BOOKING_DEPOSIT_VND).toBe(50_000);
    expect(BOOKING_CANCEL_REFUND_VND).toBe(40_000);
  });
});
