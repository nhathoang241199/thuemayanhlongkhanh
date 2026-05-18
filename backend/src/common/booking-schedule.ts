import { BookingSlot } from '../../generated/prisma/enums';
import { BookingStatus } from '../../generated/prisma/enums';

export type BookingSlotValue =
  | 'FULL_DAY'
  | 'MORNING'
  | 'AFTERNOON'
  | 'EVENING';

export const OCCUPYING_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.RENTING,
  BookingStatus.LATE_RETURN,
];

export const MAX_BOOKING_RANGE_DAYS = 30;

/** Phụ phí giao & trả máy tận nơi (VNĐ). */
export const DELIVERY_FEE_VND = 40_000;

export function deliveryFeeVnd(shippingAddress?: string | null): number {
  return shippingAddress?.trim() ? DELIVERY_FEE_VND : 0;
}

/** Hệ số nhân trên giá ngày theo số ngày thuê (≥2 ngày luôn FULL_DAY). */
export function multiDayRentalMultiplier(dayCount: number): number {
  switch (dayCount) {
    case 1:
      return 1;
    case 2:
      return 1.75;
    case 3:
      return 2.4;
    case 4:
      return 3;
    case 5:
      return 3.5;
    default:
      return 0.65 * dayCount;
  }
}

/** Tiền thuê máy (VNĐ), chưa gồm phí giao. Đồng bộ frontend rental-pricing.ts. */
export function rentalAmountVnd(
  dayCount: number,
  dayPrice: number,
  shiftPrice: number,
  slot: BookingSlotValue | BookingSlot,
): number {
  if (dayCount < 1) return 0;
  if (dayCount === 1 && slot !== 'FULL_DAY') return shiftPrice;
  return Math.round(dayPrice * multiDayRentalMultiplier(dayCount));
}

/** Khung giờ VN cho từng ca (đồng bộ với frontend booking-status.ts). */
export const SLOT_TIME_WINDOWS = {
  FULL_DAY: { startHour: 7, endHour: 23 },
  MORNING: { startHour: 7, endHour: 12 },
  AFTERNOON: { startHour: 13, endHour: 18 },
  EVENING: { startHour: 18, endHour: 23 },
} as const satisfies Record<BookingSlotValue, { startHour: number; endHour: number }>;

export function slotTimeRangeLabel(
  slot: BookingSlotValue | BookingSlot,
): string {
  const w = SLOT_TIME_WINDOWS[slot as BookingSlotValue];
  if (!w) return String(slot);
  return `${w.startHour}h – ${w.endHour}h`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** VN local time → UTC Date (Asia/Ho_Chi_Minh, UTC+7, no DST). */
export function vnDateTimeToUtc(
  dateStr: string,
  hour: number,
  minute = 0,
  second = 0,
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 7, minute, second, 0));
}

export function assertDateStr(dateStr: string): void {
  if (!DATE_RE.test(dateStr)) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
}

export function slotWindow(
  dateStr: string,
  slot: BookingSlotValue | BookingSlot,
): { startBookingDate: Date; endBookingDate: Date } {
  assertDateStr(dateStr);
  const w = SLOT_TIME_WINDOWS[slot as BookingSlotValue];
  if (!w) {
    throw new Error(`Unknown slot: ${slot as string}`);
  }
  return {
    startBookingDate: vnDateTimeToUtc(dateStr, w.startHour, 0),
    endBookingDate: vnDateTimeToUtc(dateStr, w.endHour, 0),
  };
}

/** Calendar day in VN as YYYY-MM-DD from a UTC instant. */
export function toCalendarDayVN(d: Date): string {
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vn.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function eachCalendarDayVN(
  startDate: string,
  endDate: string,
): string[] {
  assertDateStr(startDate);
  assertDateStr(endDate);
  const days: string[] = [];
  let cur = startDate;
  while (cur <= endDate) {
    days.push(cur);
    const next = addDaysDateStr(cur, 1);
    if (next <= cur) break;
    cur = next;
  }
  return days;
}

function addDaysDateStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function dayCountInclusive(startDate: string, endDate: string): number {
  return eachCalendarDayVN(startDate, endDate).length;
}

export function todayCalendarDayVN(): string {
  return toCalendarDayVN(new Date());
}

/** Booking [start,end] overlaps VN calendar day. */
export function bookingCoversCalendarDayVN(
  startBookingDate: Date,
  endBookingDate: Date,
  dateStr: string,
): boolean {
  const dayStart = vnDateTimeToUtc(dateStr, 0, 0);
  const dayEnd = vnDateTimeToUtc(dateStr, 23, 59, 59);
  return (
    startBookingDate.getTime() <= dayEnd.getTime() &&
    endBookingDate.getTime() >= dayStart.getTime()
  );
}

export function shiftUnits(m: number, a: number, e: number): number {
  return Math.max(m, a, e);
}

export function canAddSlot(
  slot: BookingSlotValue | BookingSlot,
  m: number,
  a: number,
  e: number,
  fd: number,
  quantity: number,
): boolean {
  switch (slot) {
    case 'FULL_DAY':
      return fd + 1 + shiftUnits(m, a, e) <= quantity;
    case 'MORNING':
      return fd + shiftUnits(m + 1, a, e) <= quantity;
    case 'AFTERNOON':
      return fd + shiftUnits(m, a + 1, e) <= quantity;
    case 'EVENING':
      return fd + shiftUnits(m, a, e + 1) <= quantity;
    default:
      return false;
  }
}

export function remainingForSlot(
  slot: BookingSlotValue | BookingSlot,
  m: number,
  a: number,
  e: number,
  fd: number,
  quantity: number,
): number {
  switch (slot) {
    case 'FULL_DAY':
      return Math.max(0, quantity - fd - shiftUnits(m, a, e));
    case 'MORNING':
      return Math.max(0, quantity - fd - shiftUnits(m, a, e));
    case 'AFTERNOON':
      return Math.max(0, quantity - fd - shiftUnits(m, a, e));
    case 'EVENING':
      return Math.max(0, quantity - fd - shiftUnits(m, a, e));
    default:
      return 0;
  }
}
