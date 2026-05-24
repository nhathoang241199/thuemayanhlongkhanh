import {
  multiDayRentalMultiplier,
  rentalAmountVnd,
  discountedRentalVnd,
  bookingAmountVnd,
} from './booking-schedule';

const DAY = 350_000;
const SHIFT = 200_000;

describe('multiDayRentalMultiplier', () => {
  it('returns fixed multipliers for 1–5 days', () => {
    expect(multiDayRentalMultiplier(1)).toBe(1);
    expect(multiDayRentalMultiplier(2)).toBe(1.75);
    expect(multiDayRentalMultiplier(3)).toBe(2.4);
    expect(multiDayRentalMultiplier(4)).toBe(3);
    expect(multiDayRentalMultiplier(5)).toBe(3.5);
  });

  it('returns 65% per day for 6+ days', () => {
    expect(multiDayRentalMultiplier(6)).toBeCloseTo(3.9);
    expect(multiDayRentalMultiplier(7)).toBeCloseTo(4.55);
  });
});

describe('rentalAmountVnd', () => {
  it('returns 0 for invalid day count', () => {
    expect(rentalAmountVnd(0, DAY, SHIFT, 'FULL_DAY')).toBe(0);
  });

  it('uses shift price for single-day non-full slots', () => {
    expect(rentalAmountVnd(1, DAY, SHIFT, 'MORNING')).toBe(SHIFT);
    expect(rentalAmountVnd(1, DAY, SHIFT, 'AFTERNOON')).toBe(SHIFT);
    expect(rentalAmountVnd(1, DAY, SHIFT, 'EVENING')).toBe(SHIFT);
  });

  it('uses day price for single full day', () => {
    expect(rentalAmountVnd(1, DAY, SHIFT, 'FULL_DAY')).toBe(DAY);
  });

  it('applies tiered multipliers for 2–5 days', () => {
    expect(rentalAmountVnd(2, DAY, SHIFT, 'FULL_DAY')).toBe(612_500);
    expect(rentalAmountVnd(3, DAY, SHIFT, 'FULL_DAY')).toBe(840_000);
    expect(rentalAmountVnd(4, DAY, SHIFT, 'FULL_DAY')).toBe(1_050_000);
    expect(rentalAmountVnd(5, DAY, SHIFT, 'FULL_DAY')).toBe(1_225_000);
  });

  it('applies 65% per day for 6+ days', () => {
    expect(rentalAmountVnd(6, DAY, SHIFT, 'FULL_DAY')).toBe(1_365_000);
    expect(rentalAmountVnd(7, DAY, SHIFT, 'FULL_DAY')).toBe(1_592_500);
  });
});

describe('discount pricing', () => {
  it('discounts rental only', () => {
    expect(discountedRentalVnd(200_000, 20)).toBe(160_000);
    expect(bookingAmountVnd(200_000, 20, 40_000)).toBe(200_000);
  });

  it('ignores invalid discount', () => {
    expect(discountedRentalVnd(200_000, 0)).toBe(200_000);
    expect(discountedRentalVnd(200_000, -5)).toBe(200_000);
  });
});
