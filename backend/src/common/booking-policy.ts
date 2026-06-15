import { ForbiddenException } from '@nestjs/common';

/** Chính sách thuê strict — `BOOKING_POLICY_MODE=strict`. */
export function isStrictBookingPolicy(): boolean {
  return process.env.BOOKING_POLICY_MODE === 'strict';
}

export function assertStrictBookingPolicy(): void {
  if (!isStrictBookingPolicy()) {
    throw new ForbiddenException(
      'Tính năng chỉ khả dụng khi BOOKING_POLICY_MODE=strict',
    );
  }
}
