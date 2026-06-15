import { ForbiddenException } from '@nestjs/common';
import {
  assertStrictBookingPolicy,
  isStrictBookingPolicy,
} from './booking-policy';

describe('booking-policy', () => {
  const prev = process.env.BOOKING_POLICY_MODE;

  afterEach(() => {
    if (prev === undefined) delete process.env.BOOKING_POLICY_MODE;
    else process.env.BOOKING_POLICY_MODE = prev;
  });

  it('is false when env unset', () => {
    delete process.env.BOOKING_POLICY_MODE;
    expect(isStrictBookingPolicy()).toBe(false);
  });

  it('is true when strict', () => {
    process.env.BOOKING_POLICY_MODE = 'strict';
    expect(isStrictBookingPolicy()).toBe(true);
  });

  it('assertStrictBookingPolicy throws when not strict', () => {
    delete process.env.BOOKING_POLICY_MODE;
    expect(() => assertStrictBookingPolicy()).toThrow(ForbiddenException);
  });
});
