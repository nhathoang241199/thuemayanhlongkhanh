import { isLateReturnBooking } from "@/lib/booking-status";

import type {
  Booking,
  BookingStatusValue,
  PaymentStatusValue,
} from "./booking-types";

export { isLateReturnBooking };

const vnDateTimeZone = "Asia/Ho_Chi_Minh";

const bookingDateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: vnDateTimeZone,
});

const pickupTimeFmt = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: vnDateTimeZone,
});

export const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatBookingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return bookingDateFmt.format(d);
}

export function bookingVnDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: vnDateTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function parseDateKey(key: string): Date {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function dateKeyAddDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Ngày nhận máy = hôm nay hoặc ngày mai (theo todayKey của bộ lọc). */
function pickupDayInMobilePickupWindow(
  pickupDayKey: string,
  todayKey: string,
): boolean {
  return (
    pickupDayKey === todayKey ||
    pickupDayKey === dateKeyAddDays(todayKey, 1)
  );
}

function pickupDaySortRank(pickupDayKey: string, todayKey: string): number {
  if (pickupDayKey === todayKey) return 0;
  if (pickupDayKey === dateKeyAddDays(todayKey, 1)) return 1;
  return 2;
}

function relativeDayLabelVn(dateKey: string, refKey: string): string | null {
  const diff = Math.round(
    (parseDateKey(dateKey).getTime() - parseDateKey(refKey).getTime()) /
      86_400_000,
  );
  if (diff === 0) return "Hôm nay";
  if (diff === -1) return "Hôm qua";
  if (diff === 1) return "Ngày mai";
  return null;
}

/** Ngày thuê: Hôm nay / Hôm qua / Ngày mai, hoặc dd/mm theo múi VN. */
export function formatBookingDateRelative(
  iso: string,
  refDate: Date = new Date(),
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const key = bookingVnDateKey(iso);
  const refKey = bookingVnDateKey(refDate.toISOString());
  return relativeDayLabelVn(key, refKey) ?? formatBookingDate(iso);
}

/** Nhận máy: Hôm nay/Hôm qua/Ngày mai + giờ, hoặc dd/mm + giờ (múi VN). */
export function formatPickupAtRelative(
  iso: string,
  refDate: Date = new Date(),
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = pickupTimeFmt.format(d);
  const dayPart = formatBookingDateRelative(iso, refDate);
  return `${time} ${dayPart}`;
}

export function formatPickupAtTable(iso: string): string {
  return formatPickupAtRelative(iso);
}

export function paymentBadgeProps(s: string): {
  label: string;
  colorPalette: "gray" | "green" | "red" | "orange" | "ocean" | "cerulean";
} {
  switch (s) {
    case "PENDING":
      return { label: "Chưa cọc", colorPalette: "orange" };
    case "DEPOSITED":
      return { label: "Đã cọc", colorPalette: "cerulean" };
    case "PAID":
      return { label: "Đã thanh toán", colorPalette: "green" };
    case "REFUNDED":
      return { label: "Đã hoàn tiền", colorPalette: "gray" };
    default:
      return { label: s, colorPalette: "gray" };
  }
}

export function statusBadgeProps(s: string): {
  label: string;
  colorPalette:
    | "gray"
    | "green"
    | "red"
    | "orange"
    | "ocean"
    | "cerulean"
    | "purple";
} {
  switch (s) {
    case "PENDING_PAYMENT":
      return { label: "Chờ cọc", colorPalette: "orange" };
    case "CONFIRMED":
      return { label: "Chờ lấy máy", colorPalette: "purple" };
    case "RENTING":
      return { label: "Đang thuê", colorPalette: "cerulean" };
    case "COMPLETED":
      return { label: "Hoàn tất", colorPalette: "green" };
    case "PENDING_REFUND_CANCEL":
      return { label: "Chờ hoàn tiền", colorPalette: "orange" };
    case "CANCELLED":
      return { label: "Đã hủy", colorPalette: "red" };
    default:
      return { label: s, colorPalette: "gray" };
  }
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function bookingLocalDateKey(bookingIso: string): string {
  return toLocalDateKey(new Date(bookingIso));
}

const MOBILE_TODAY_PICKUP_STATUSES = new Set<BookingStatusValue>([
  "PENDING_PAYMENT",
  "CONFIRMED",
]);

const MOBILE_TODAY_RENTING_STATUSES = new Set<BookingStatusValue>(["RENTING"]);

const MOBILE_TODAY_COMPLETED_STATUSES = new Set<BookingStatusValue>([
  "COMPLETED",
]);

export const SEARCH_RENTING_STATUSES = new Set<BookingStatusValue>(["RENTING"]);

export function isActiveRentingStatus(status: BookingStatusValue): boolean {
  return status === "RENTING";
}

function pickupSortTimeMs(b: Booking): number {
  return new Date(b.pickupAt ?? b.startBookingDate).getTime();
}

function returnSortTimeMs(b: Booking): number {
  return new Date(b.endBookingDate).getTime();
}

function startBookingSortTimeMs(b: Booking): number {
  return new Date(b.startBookingDate).getTime();
}

/** Mobile — đơn hôm nay: chờ cọc/lấy máy & hoàn tất (nhận hôm nay/mai), đang thuê (trả hôm nay). */
export function isMobileTodayBookingsMode(params: {
  isMobileViewport: boolean;
  showAllDates: boolean;
  filterByPickupTime: boolean;
  filterDateKey: string;
  todayKey: string;
}): boolean {
  return (
    params.isMobileViewport &&
    !params.showAllDates &&
    params.filterByPickupTime &&
    params.filterDateKey === params.todayKey
  );
}

export function filterAndSortMobileTodayBookings(
  bookings: Booking[],
  todayKey: string,
): Booking[] {
  const pickupQueue: Booking[] = [];
  const rentingQueue: Booking[] = [];
  const completedPickupTodayQueue: Booking[] = [];

  for (const b of bookings) {
    const status = b.status as BookingStatusValue;
    const pickupDayKey = bookingVnDateKey(b.pickupAt ?? b.startBookingDate);
    if (MOBILE_TODAY_PICKUP_STATUSES.has(status)) {
      if (pickupDayInMobilePickupWindow(pickupDayKey, todayKey)) {
        pickupQueue.push(b);
      }
    } else if (MOBILE_TODAY_RENTING_STATUSES.has(status)) {
      if (bookingVnDateKey(b.endBookingDate) === todayKey) {
        rentingQueue.push(b);
      }
    } else if (MOBILE_TODAY_COMPLETED_STATUSES.has(status)) {
      if (pickupDayInMobilePickupWindow(pickupDayKey, todayKey)) {
        completedPickupTodayQueue.push(b);
      }
    }
  }

  const comparePickupWindow = (a: Booking, b: Booking) => {
    const keyA = bookingVnDateKey(a.pickupAt ?? a.startBookingDate);
    const keyB = bookingVnDateKey(b.pickupAt ?? b.startBookingDate);
    const dayCmp = pickupDaySortRank(keyA, todayKey) - pickupDaySortRank(keyB, todayKey);
    if (dayCmp !== 0) return dayCmp;
    return pickupSortTimeMs(a) - pickupSortTimeMs(b);
  };

  pickupQueue.sort(comparePickupWindow);
  rentingQueue.sort((a, b) => returnSortTimeMs(a) - returnSortTimeMs(b));
  completedPickupTodayQueue.sort((a, b) => {
    const keyA = bookingVnDateKey(a.pickupAt ?? a.startBookingDate);
    const keyB = bookingVnDateKey(b.pickupAt ?? b.startBookingDate);
    const dayCmp = pickupDaySortRank(keyA, todayKey) - pickupDaySortRank(keyB, todayKey);
    if (dayCmp !== 0) return dayCmp;
    return returnSortTimeMs(b) - returnSortTimeMs(a);
  });

  return [...pickupQueue, ...rentingQueue, ...completedPickupTodayQueue];
}

/**
 * Khi admin tìm SĐT/tên/mã — ưu tiên đơn cần xử lý (nhận máy / trả máy gần nhất),
 * sau đó chờ hoàn tiền, cuối cùng đơn đã xong hoặc đã hủy (mới nhất trước).
 */
export function sortAdminSearchBookings(bookings: Booking[]): Booking[] {
  const pickupQueue: Booking[] = [];
  const rentingQueue: Booking[] = [];
  const refundQueue: Booking[] = [];
  const archiveQueue: Booking[] = [];

  for (const b of bookings) {
    const status = b.status as BookingStatusValue;
    if (MOBILE_TODAY_PICKUP_STATUSES.has(status)) {
      pickupQueue.push(b);
    } else if (SEARCH_RENTING_STATUSES.has(status)) {
      rentingQueue.push(b);
    } else if (status === "PENDING_REFUND_CANCEL") {
      refundQueue.push(b);
    } else {
      archiveQueue.push(b);
    }
  }

  pickupQueue.sort((a, b) => pickupSortTimeMs(a) - pickupSortTimeMs(b));
  rentingQueue.sort((a, b) => returnSortTimeMs(a) - returnSortTimeMs(b));
  refundQueue.sort(
    (a, b) => startBookingSortTimeMs(b) - startBookingSortTimeMs(a),
  );
  archiveQueue.sort(
    (a, b) => startBookingSortTimeMs(b) - startBookingSortTimeMs(a),
  );

  return [...pickupQueue, ...rentingQueue, ...refundQueue, ...archiveQueue];
}

export const BOOKING_STATUS_EDIT_OPTIONS: {
  value: BookingStatusValue;
  label: string;
}[] = [
  { value: "PENDING_PAYMENT", label: "Chờ cọc" },
  { value: "CONFIRMED", label: "Chờ lấy máy" },
  { value: "RENTING", label: "Đang thuê" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "PENDING_REFUND_CANCEL", label: "Chờ hoàn tiền" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export const BOOKING_PAYMENT_EDIT_OPTIONS: {
  value: PaymentStatusValue;
  label: string;
}[] = [
  { value: "PENDING", label: "Chưa cọc" },
  { value: "DEPOSITED", label: "Đã cọc" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "REFUNDED", label: "Đã hoàn tiền" },
];
