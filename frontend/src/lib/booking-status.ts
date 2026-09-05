import { dayCountInclusive, type BookingSlot } from "@/lib/booking-api";
import {
  addDaysYmd,
  datetimeLocalToIso,
  formatWeekdayDateAbbrViFromIso,
  isoToCalendarDateKey,
  toDatetimeLocalValue,
} from "@/lib/datetime-vn";
import { isReturnNextMorningEligible } from "@/lib/rental-pricing";

/** Hạn trả máy thực tế — trả sáng hôm sau: trước 12h ngày kế sau ngày kết thúc thuê. */
export function effectiveReturnDeadlineIso(
  endBookingDate: string,
  slot: string,
  returnNextMorning = false,
): string {
  if (!returnNextMorning || !isReturnNextMorningEligible(slot as BookingSlot)) {
    return endBookingDate;
  }
  const endKey = isoToCalendarDateKey(endBookingDate);
  if (!endKey) return endBookingDate;
  const morningDay = addDaysYmd(endKey, 1);
  return datetimeLocalToIso(toDatetimeLocalValue(morningDay, 12, 0));
}

/** RENTING và đã quá hạn trả — chỉ hiển thị badge, không đổi status DB. */
export function isLateReturnBooking(
  booking: {
    status: string;
    endBookingDate: string;
    returnNextMorning?: boolean;
    slot?: string;
  },
  now: Date = new Date(),
): boolean {
  if (booking.status !== "RENTING") return false;
  const deadline = new Date(
    effectiveReturnDeadlineIso(
      booking.endBookingDate,
      booking.slot ?? "",
      booking.returnNextMorning,
    ),
  );
  return (
    !Number.isNaN(deadline.getTime()) && deadline.getTime() < now.getTime()
  );
}

export function bookingStatusLabel(status: string): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Chờ cọc";
    case "CONFIRMED":
      return "Đã cọc";
    case "RENTING":
      return "Đang thuê";
    case "COMPLETED":
      return "Hoàn tất";
    case "PENDING_REFUND_CANCEL":
      return "Chờ hoàn tiền";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

export function cameraReadinessBadgeProps(cameraReady: boolean): {
  label: string;
  colorPalette: "green" | "red";
} {
  return cameraReady
    ? { label: "Máy sẵn sàng", colorPalette: "green" }
    : { label: "Chưa có máy", colorPalette: "red" };
}

export function bookingStatusColor(
  status: string,
): "gray" | "green" | "red" | "orange" | "cerulean" | "purple" {
  switch (status) {
    case "PENDING_PAYMENT":
      return "orange";
    case "CONFIRMED":
      return "green";
    case "RENTING":
      return "cerulean";
    case "COMPLETED":
      return "green";
    case "PENDING_REFUND_CANCEL":
      return "orange";
    case "CANCELLED":
      return "red";
    default:
      return "gray";
  }
}

/** Đồng bộ với backend SLOT_TIME_WINDOWS (booking-schedule.ts). */
/** Phụ phí giao & trả máy tận nơi — đồng bộ backend booking-schedule.ts */
export const DELIVERY_FEE_VND = 0;

export const SLOT_TIME_WINDOWS = {
  FULL_DAY: { startHour: 7, endHour: 23 },
  MORNING: { startHour: 7, endHour: 12 },
  AFTERNOON: { startHour: 13, endHour: 18 },
  EVENING: { startHour: 18, endHour: 23 },
} as const;

export function slotTimeRangeLabel(slot: string): string {
  const w = SLOT_TIME_WINDOWS[slot as keyof typeof SLOT_TIME_WINDOWS];
  if (!w) return "";
  return `${w.startHour}h – ${w.endHour}h`;
}

export function slotLabelVi(slot: string): string {
  switch (slot) {
    case "FULL_DAY":
      return "Cả ngày";
    case "MORNING":
      return "Sáng";
    case "AFTERNOON":
      return "Chiều";
    case "EVENING":
      return "Tối";
    default:
      return slot;
  }
}

/** Chuỗi gọn (không ngoặc). UI nút ca nên dùng `<SlotHoursLabel />`. */
export function slotLabelWithHoursVi(slot: string): string {
  const hours = slotTimeRangeLabel(slot);
  const name = slotLabelVi(slot);
  return hours ? `${name} ${hours}` : name;
}

/** Lịch ngày VN (yyyy-mm-dd) từ instant UTC — đồng bộ backend toCalendarDayVN. */
function toCalendarDayVN(d: Date): string {
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vn.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** dd-mm-yyyy (không giờ) cho card đơn khách. */
function formatCalendarDayShort(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}-${m}-${y}`;
}

export function formatBookingRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return startIso;
  }
  const startDay = toCalendarDayVN(start);
  const endDay = toCalendarDayVN(end);
  const startLabel = formatCalendarDayShort(startDay);
  if (startDay === endDay) {
    return startLabel;
  }
  return `${startLabel} → ${formatCalendarDayShort(endDay)}`;
}

function bookingUsageSlotPrefix(slot: string, dayCount: number): string {
  if (slot === "FULL_DAY") {
    return `${dayCount} ngày`;
  }
  switch (slot) {
    case "MORNING":
      return "sáng";
    case "AFTERNOON":
      return "chiều";
    case "EVENING":
      return "tối";
    default:
      return slotLabelVi(slot).toLocaleLowerCase("vi-VN");
  }
}

function formatYmdSlashVi(ymd: string): string {
  const [, m, d] = ymd.split("-");
  if (!m || !d) return ymd;
  return `${d}/${m}`;
}

/**
 * Giá trị thời gian thuê (/home).
 * 1 ngày: "1 ngày – CN, 31/05", "sáng – T2, 01/06", …
 * ≥2 ngày: "27/05 → 30/05"; trả sáng hôm sau: "27/05 → 31/05(sáng)".
 */
export function formatBookingUsageDetailHome(
  startIso: string,
  endIso: string,
  slot: string,
  returnNextMorning = false,
): string {
  const startKey = isoToCalendarDateKey(startIso);
  const endKey = isoToCalendarDateKey(endIso);
  if (!startKey || !endKey) return "—";
  const dayCount = dayCountInclusive(startKey, endKey);

  if (dayCount >= 2) {
    const endDisplayKey = returnNextMorning ? addDaysYmd(endKey, 1) : endKey;
    const endSuffix = returnNextMorning ? "(sáng)" : "";
    return `${formatYmdSlashVi(startKey)} → ${formatYmdSlashVi(endDisplayKey)}${endSuffix}`;
  }

  const prefix = bookingUsageSlotPrefix(slot, dayCount);
  const dayPart = formatWeekdayDateAbbrViFromIso(startIso);
  return `${prefix} – ${dayPart}`;
}

/**
 * Card đơn khách (/home): "Sử dụng: 1 ngày – CN, 31/05", …
 */
export function formatBookingTimeLineHome(
  startIso: string,
  endIso: string,
  slot: string,
): string {
  return `Sử dụng: ${formatBookingUsageDetailHome(startIso, endIso, slot)}`;
}
