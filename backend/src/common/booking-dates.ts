export type { BookingSlotValue } from './booking-schedule';
export { slotWindow, toCalendarDayVN } from './booking-schedule';

import { slotWindow, toCalendarDayVN, type BookingSlotValue } from './booking-schedule';

/** End of slot on the same calendar day (VN) as start. */
export function inferEndBookingDate(
  start: Date,
  slot: BookingSlotValue,
): Date {
  const dateStr = toCalendarDayVN(start);
  return slotWindow(dateStr, slot).endBookingDate;
}
