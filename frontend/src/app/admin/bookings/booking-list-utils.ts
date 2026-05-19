import type { BookingStatusValue, PaymentStatusValue } from "./booking-types";

const vnDateTimeZone = "Asia/Ho_Chi_Minh";

const bookingDateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: vnDateTimeZone,
});

const pickupAtTableFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
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

export function formatPickupAtTable(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return pickupAtTableFmt.format(d);
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
    case "LATE_RETURN":
      return { label: "Trả trễ", colorPalette: "red" };
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

export const BOOKING_STATUS_EDIT_OPTIONS: {
  value: BookingStatusValue;
  label: string;
}[] = [
  { value: "PENDING_PAYMENT", label: "Chờ cọc" },
  { value: "CONFIRMED", label: "Chờ lấy máy" },
  { value: "RENTING", label: "Đang thuê" },
  { value: "LATE_RETURN", label: "Trả trễ" },
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
