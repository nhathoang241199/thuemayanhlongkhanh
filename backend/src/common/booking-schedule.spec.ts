import {
  assertPickupAtValid,
  isReturnNextMorningEligible,
  rentalAmountWithOptionsVnd,
  returnNextMorningDate,
  returnNextMorningOccupancyDate,
  returnNextMorningSurchargeVnd,
  vnDateTimeToUtc,
} from './booking-schedule';

describe('assertPickupAtValid FULL_DAY same-day pickup', () => {
  const startDate = '2026-05-31';

  it('accepts 6:00 and 22:59', () => {
    expect(() =>
      assertPickupAtValid(
        startDate,
        'FULL_DAY',
        vnDateTimeToUtc(startDate, 6, 0),
      ),
    ).not.toThrow();
    expect(() =>
      assertPickupAtValid(
        startDate,
        'FULL_DAY',
        vnDateTimeToUtc(startDate, 22, 59),
      ),
    ).not.toThrow();
  });

  it('rejects before 6:00 and after 22:59', () => {
    expect(() =>
      assertPickupAtValid(
        startDate,
        'FULL_DAY',
        vnDateTimeToUtc(startDate, 5, 59),
      ),
    ).toThrow(/từ 6h đến 22h/);
    expect(() =>
      assertPickupAtValid(
        startDate,
        'FULL_DAY',
        vnDateTimeToUtc(startDate, 23, 0),
      ),
    ).toThrow(/từ 6h đến 22h/);
  });

  it('does not require rental window 7h–23h for pickup', () => {
    expect(() =>
      assertPickupAtValid(
        startDate,
        'FULL_DAY',
        vnDateTimeToUtc(startDate, 6, 30),
      ),
    ).not.toThrow();
  });
});

describe('return next morning', () => {
  it('charges 50% of day price as surcharge', () => {
    expect(returnNextMorningSurchargeVnd(700_000)).toBe(350_000);
  });

  it('adds surcharge only for FULL_DAY and EVENING', () => {
    const day = 700_000;
    const shift = 400_000;
    expect(
      rentalAmountWithOptionsVnd(1, day, shift, 'FULL_DAY', true),
    ).toBe(day + 350_000);
    expect(
      rentalAmountWithOptionsVnd(1, day, shift, 'EVENING', true),
    ).toBe(shift + 350_000);
    expect(
      rentalAmountWithOptionsVnd(1, day, shift, 'MORNING', true),
    ).toBe(shift);
  });

  it('targets morning on calendar day after rental end', () => {
    expect(returnNextMorningDate('2026-05-31')).toBe('2026-06-01');
    expect(
      returnNextMorningOccupancyDate(
        vnDateTimeToUtc('2026-05-31', 23, 0),
      ),
    ).toBe('2026-06-01');
  });

  it('eligibility', () => {
    expect(isReturnNextMorningEligible('FULL_DAY')).toBe(true);
    expect(isReturnNextMorningEligible('EVENING')).toBe(true);
    expect(isReturnNextMorningEligible('MORNING')).toBe(false);
  });
});
