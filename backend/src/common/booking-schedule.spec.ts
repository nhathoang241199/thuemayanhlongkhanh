import {
  assertPickupAtValid,
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
