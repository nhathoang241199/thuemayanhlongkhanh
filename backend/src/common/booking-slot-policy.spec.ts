import { BadRequestException } from '@nestjs/common';
import { BookingSlot } from '../../generated/prisma/enums';
import {
  assertBookingSlotAllowed,
  getAllowedBookingSlots,
} from './booking-slot-policy';

describe('booking-slot-policy', () => {
  const prev = process.env.BOOKING_ALLOWED_SLOTS;

  afterEach(() => {
    if (prev === undefined) delete process.env.BOOKING_ALLOWED_SLOTS;
    else process.env.BOOKING_ALLOWED_SLOTS = prev;
  });

  it('allows all slots when env unset', () => {
    delete process.env.BOOKING_ALLOWED_SLOTS;
    expect(getAllowedBookingSlots()).toBeNull();
    expect(() => assertBookingSlotAllowed(BookingSlot.MORNING)).not.toThrow();
  });

  it('rejects disallowed slot when env is FULL_DAY only', () => {
    process.env.BOOKING_ALLOWED_SLOTS = 'FULL_DAY';
    expect(getAllowedBookingSlots()).toEqual([BookingSlot.FULL_DAY]);
    expect(() => assertBookingSlotAllowed(BookingSlot.FULL_DAY)).not.toThrow();
    expect(() => assertBookingSlotAllowed(BookingSlot.MORNING)).toThrow(
      BadRequestException,
    );
  });
});
