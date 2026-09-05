import type { BookingSlot } from "@/lib/booking-api";

/** Khung giờ VN — đồng bộ backend SLOT_TIME_WINDOWS. */
const SLOT_TIME_WINDOWS: Record<
  BookingSlot,
  { startHour: number; endHour: number }
> = {
  FULL_DAY: { startHour: 7, endHour: 23 },
  MORNING: { startHour: 7, endHour: 12 },
  AFTERNOON: { startHour: 13, endHour: 18 },
  EVENING: { startHour: 18, endHour: 23 },
};

/** Ca cả ngày — nhận sớm hôm trước ngày thuê 17h–23h (đồng bộ backend). */
const FULL_DAY_EARLY_PICKUP_START_HOUR = 17;
const FULL_DAY_EARLY_PICKUP_END_HOUR = 23;

/** Ca cả ngày — giờ nhận trong ngày thuê (picker; khoảng thuê vẫn 7h–23h). */
const FULL_DAY_SAME_DAY_PICKUP_START_HOUR = 6;
const FULL_DAY_SAME_DAY_PICKUP_END_HOUR = 22;

/** Buổi ca — được nhận máy sớm hơn giờ bắt đầu ca. */
const SHIFT_EARLY_PICKUP_HOURS = 1;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** datetime-local value (VN wall clock) từ YYYY-MM-DD + giờ. */
export function toDatetimeLocalValue(
  dateStr: string,
  hour: number,
  minute = 0,
): string {
  return `${dateStr}T${pad2(hour)}:${pad2(minute)}`;
}

function hourRange(fromHour: number, toHourInclusive: number): number[] {
  const hours: number[] = [];
  for (let h = fromHour; h <= toHourInclusive; h++) hours.push(h);
  return hours;
}

function formatYmdShortVi(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function weekdayYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Thứ Bảy theo lịch (YYYY-MM-DD). */
export function isSaturdayYmd(ymd: string): boolean {
  return weekdayYmd(ymd) === 6;
}

const WEEKDAY_LABEL_VI = [
  "chủ nhật",
  "thứ hai",
  "thứ ba",
  "thứ tư",
  "thứ năm",
  "thứ sáu",
  "thứ bảy",
] as const;

function weekdayLabelViFromYmd(ymd: string): string {
  return WEEKDAY_LABEL_VI[weekdayYmd(ymd)];
}

/**
 * Ngày kèm thứ: "chủ nhật hôm nay", "thứ hai ngày mai", "chủ nhật 31-05".
 */
export function formatDayWithWeekdayLowerVi(
  iso: string,
  refDate: Date = new Date(),
): string {
  const key = isoToCalendarDateKey(iso);
  if (!key) return iso;
  const weekday = weekdayLabelViFromYmd(key);
  const today = vnTodayDateKey(refDate);
  const diff = Math.round(
    (parseYmdLocal(key).getTime() - parseYmdLocal(today).getTime()) /
      86_400_000,
  );
  if (diff === 0) return `${weekday} hôm nay`;
  if (diff === -1) return `${weekday} hôm qua`;
  if (diff === 1) return `${weekday} ngày mai`;
  const [, m, d] = key.split("-");
  return `${weekday} ${d}-${m}`;
}

/** Giờ sớm nhất được nhận máy hôm trước ngày thuê (ca cả ngày). */
export function fullDayEarlyPickupStartHour(_prevDayYmd: string): number {
  return FULL_DAY_EARLY_PICKUP_START_HOUR;
}

export type PickupTimeParts = {
  dateYmd: string;
  hour: number;
  minute: number;
};

/** Các ngày được chọn khi nhận máy. */
export function pickupAllowedDates(
  startDate: string,
  slot: BookingSlot,
): { value: string; label: string }[] {
  if (slot === "FULL_DAY") {
    const prevDay = addDaysYmd(startDate, -1);
    return [
      {
        value: prevDay,
        label: `Hôm trước (${formatYmdShortVi(prevDay)})`,
      },
      {
        value: startDate,
        label: `Ngày thuê (${formatYmdShortVi(startDate)})`,
      },
    ];
  }
  return [
    {
      value: startDate,
      label: formatYmdShortVi(startDate),
    },
  ];
}

/** Giờ được phép chọn theo ngày + buổi thuê. */
export function pickupAllowedHours(
  startDate: string,
  slot: BookingSlot,
  dateYmd: string,
): number[] {
  const w = SLOT_TIME_WINDOWS[slot];
  if (slot === "FULL_DAY") {
    const prevDay = addDaysYmd(startDate, -1);
    if (dateYmd === prevDay) {
      return hourRange(
        fullDayEarlyPickupStartHour(prevDay),
        FULL_DAY_EARLY_PICKUP_END_HOUR,
      );
    }
    if (dateYmd === startDate) {
      return hourRange(
        FULL_DAY_SAME_DAY_PICKUP_START_HOUR,
        FULL_DAY_SAME_DAY_PICKUP_END_HOUR,
      );
    }
    return [];
  }
  if (dateYmd !== startDate) return [];
  const pickupStartHour = w.startHour - SHIFT_EARLY_PICKUP_HOURS;
  const pickupEndHour = w.endHour - 1;
  return hourRange(pickupStartHour, pickupEndHour);
}

export function pickupPartsToLocal(parts: PickupTimeParts): string {
  return toDatetimeLocalValue(parts.dateYmd, parts.hour, parts.minute);
}

export function pickupLocalToParts(local: string): PickupTimeParts | null {
  try {
    const { datePart, totalMinutes } = pickupLocalParts(local);
    return {
      dateYmd: datePart,
      hour: Math.floor(totalMinutes / 60),
      minute: totalMinutes % 60,
    };
  } catch {
    return null;
  }
}

export function slotPickupBounds(
  startDate: string,
  slot: BookingSlot,
): { minLocal: string; maxLocal: string; defaultLocal: string } {
  const w = SLOT_TIME_WINDOWS[slot];
  if (slot === "FULL_DAY") {
    const prevDay = addDaysYmd(startDate, -1);
    return {
      minLocal: toDatetimeLocalValue(
        prevDay,
        fullDayEarlyPickupStartHour(prevDay),
        0,
      ),
      maxLocal: toDatetimeLocalValue(
        startDate,
        FULL_DAY_SAME_DAY_PICKUP_END_HOUR,
        0,
      ),
      defaultLocal: toDatetimeLocalValue(startDate, w.startHour, 0),
    };
  }
  const pickupStartHour = w.startHour - SHIFT_EARLY_PICKUP_HOURS;
  const pickupEndHour = w.endHour - 1;
  return {
    minLocal: toDatetimeLocalValue(startDate, pickupStartHour, 0),
    maxLocal: toDatetimeLocalValue(startDate, pickupEndHour, 59),
    defaultLocal: toDatetimeLocalValue(startDate, w.startHour, 0),
  };
}

function pickupLocalParts(local: string): {
  datePart: string;
  totalMinutes: number;
} {
  const [datePart, timePart] = local.split("T");
  if (!datePart || !timePart) {
    throw new Error("Thời gian nhận máy không hợp lệ");
  }
  const [hour, minute] = timePart.split(":").map(Number);
  return { datePart, totalMinutes: hour * 60 + (minute ?? 0) };
}

/** Kiểm tra trước submit — trả về thông báo lỗi hoặc null nếu hợp lệ. */
export function validatePickupAtLocal(
  startDate: string,
  slot: BookingSlot,
  local: string,
): string | null {
  try {
    const { datePart, totalMinutes } = pickupLocalParts(local);
    const w = SLOT_TIME_WINDOWS[slot];

    if (slot === "FULL_DAY") {
      const prevDay = addDaysYmd(startDate, -1);
      if (datePart === prevDay) {
        const minHour = fullDayEarlyPickupStartHour(prevDay);
        const min = minHour * 60;
        const max = FULL_DAY_EARLY_PICKUP_END_HOUR * 60 + 59;
        if (totalMinutes < min || totalMinutes > max) {
          return "Thời gian nhận máy hôm trước ngày thuê phải từ 17h chiều đến 23h";
        }
        return null;
      }
      if (datePart === startDate) {
        const startMinutes = FULL_DAY_SAME_DAY_PICKUP_START_HOUR * 60;
        const endMinutes = FULL_DAY_SAME_DAY_PICKUP_END_HOUR * 60 + 59;
        if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
          return "Thời gian nhận máy trong ngày thuê phải từ 6h đến 22h";
        }
        return null;
      }
      return "Thời gian nhận máy phải trong ngày thuê hoặc hôm trước ngày thuê (ca cả ngày)";
    }

    if (datePart !== startDate) {
      return "Thời gian nhận máy phải trong ngày bắt đầu thuê";
    }
    const pickupStartHour = w.startHour - SHIFT_EARLY_PICKUP_HOURS;
    const pickupEndHour = w.endHour - 1;
    const minMinutes = pickupStartHour * 60;
    const maxMinutes = pickupEndHour * 60 + 59;
    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
      return `Thời gian nhận máy phải từ ${pickupStartHour}h đến ${pickupEndHour}h trong ngày thuê (ca ${w.startHour}h–${w.endHour}h)`;
    }
    return null;
  } catch {
    return "Thời gian nhận máy không hợp lệ";
  }
}

/** Ngày thuê (YYYY-MM-DD) + buổi → ISO bắt đầu/kết thúc (đồng bộ backend slotWindow). */
export function slotBookingRangeToIso(
  rangeStart: string,
  rangeEnd: string,
  slot: BookingSlot,
): { startBookingDate: string; endBookingDate: string } {
  const w = SLOT_TIME_WINDOWS[slot];
  return {
    startBookingDate: datetimeLocalToIso(
      toDatetimeLocalValue(rangeStart, w.startHour, 0),
    ),
    endBookingDate: datetimeLocalToIso(
      toDatetimeLocalValue(rangeEnd, w.endHour, 0),
    ),
  };
}

/** ISO UTC → YYYY-MM-DD theo lịch VN. */
export function isoToCalendarDateKey(iso: string): string {
  const local = isoToDatetimeLocal(iso);
  return local ? local.slice(0, 10) : "";
}

/** Hôm nay theo lịch VN (YYYY-MM-DD). */
export function vnTodayDateKey(ref: Date = new Date()): string {
  return isoToCalendarDateKey(ref.toISOString());
}

/** Đơn thuê có phủ calendar day `dateKey` (YYYY-MM-DD, VN) không. */
export function bookingCoversDateKeyVN(
  startIso: string,
  endIso: string,
  dateKey: string,
): boolean {
  const startKey = isoToCalendarDateKey(startIso);
  const endKey = isoToCalendarDateKey(endIso);
  if (!startKey || !endKey || !dateKey) return false;
  return startKey <= dateKey && dateKey <= endKey;
}

/** Ngày nhận máy (VN) là hôm qua, hôm nay hoặc ngày mai. */
export function pickupIsoIsYesterdayTodayOrTomorrowVn(
  pickupIso: string,
  ref: Date = new Date(),
): boolean {
  const pickupDay = isoToCalendarDateKey(pickupIso);
  if (!pickupDay) return false;
  const today = vnTodayDateKey(ref);
  const yesterday = addDaysYmd(today, -1);
  const tomorrow = addDaysYmd(today, 1);
  return (
    pickupDay === yesterday ||
    pickupDay === today ||
    pickupDay === tomorrow
  );
}

/** Coi chuỗi datetime-local là giờ VN (UTC+7) → ISO UTC. */
export function datetimeLocalToIso(local: string): string {
  const { datePart, totalMinutes } = pickupLocalParts(local);
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(
    Date.UTC(y, m - 1, d, hour - 7, minute, 0, 0),
  ).toISOString();
}

/** ISO UTC → datetime-local (VN wall clock). */
export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const y = vn.getUTCFullYear();
  const m = pad2(vn.getUTCMonth() + 1);
  const day = pad2(vn.getUTCDate());
  const h = pad2(vn.getUTCHours());
  const min = pad2(vn.getUTCMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** Chủ nhật theo lịch (YYYY-MM-DD). */
export function isSundayYmd(ymd: string): boolean {
  return weekdayYmd(ymd) === 0;
}

const pickupFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Ho_Chi_Minh",
});

export function formatPickupAtVi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return pickupFmt.format(d);
}

function pickupHourMinuteVN(
  iso: string,
): { hour: number; minute: number } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

/** Giờ nhận máy dạng "3 giờ chiều" (múi VN). */
function vnPickupTimePhrase(hour24: number): string {
  if (hour24 >= 6 && hour24 <= 10) {
    return `${hour24} giờ sáng`;
  }
  if (hour24 === 11 || hour24 === 12) {
    return `${hour24} giờ trưa`;
  }
  if (hour24 >= 13 && hour24 <= 17) {
    return `${hour24 - 12} giờ chiều`;
  }
  if (hour24 >= 18 && hour24 <= 23) {
    return `${hour24 - 12} giờ tối`;
  }
  if (hour24 >= 0 && hour24 <= 5) {
    const h = hour24 === 0 ? 12 : hour24;
    return `${h} giờ đêm`;
  }
  return `${hour24} giờ`;
}

function parseYmdLocal(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** T2–T7, CN (Chủ nhật). */
const WEEKDAY_ABBR_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

/** "CN, 31/05" từ ISO (lịch VN). */
export function formatWeekdayDateAbbrViFromIso(iso: string): string {
  const key = isoToCalendarDateKey(iso);
  if (!key) return iso;
  const weekday = WEEKDAY_ABBR_VI[weekdayYmd(key)];
  const [, m, d] = key.split("-");
  return `${weekday}, ${d}/${m}`;
}

/** Buổi trong ngày (chỉ tên buổi, không kèm giờ). */
function vnPickupDayPeriod(hour24: number): string {
  if (hour24 >= 6 && hour24 <= 10) return "sáng";
  if (hour24 === 11 || hour24 === 12) return "trưa";
  if (hour24 >= 13 && hour24 <= 17) return "chiều";
  if (hour24 >= 18 && hour24 <= 23) return "tối";
  return "đêm";
}

/**
 * Trang /home: "07:00 sáng – CN, 31/05".
 */
export function formatPickupAtHomeDisplay(iso: string): string {
  const hm = pickupHourMinuteVN(iso);
  if (!hm) return iso;
  const key = isoToCalendarDateKey(iso);
  if (!key) return iso;
  const period = vnPickupDayPeriod(hm.hour);
  return `${pad2(hm.hour)}:${pad2(hm.minute)} ${period} – ${formatWeekdayDateAbbrViFromIso(iso)}`;
}

/** Ngày nhận máy gọn (không thứ): "hôm nay", "hôm qua", "ngày mai", "31-05". */
function formatPickupDayRelativeLowerVi(
  iso: string,
  refDate: Date = new Date(),
): string {
  const key = isoToCalendarDateKey(iso);
  if (!key) return iso;
  const today = vnTodayDateKey(refDate);
  const diff = Math.round(
    (parseYmdLocal(key).getTime() - parseYmdLocal(today).getTime()) /
      86_400_000,
  );
  if (diff === 0) return "hôm nay";
  if (diff === -1) return "hôm qua";
  if (diff === 1) return "ngày mai";
  const [, m, d] = key.split("-");
  return `${d}-${m}`;
}

/**
 * Admin mobile card: "7 giờ tối hôm nay" (không kèm thứ).
 */
export function formatPickupAtMobileCard(
  iso: string,
  refDate: Date = new Date(),
): string {
  const hm = pickupHourMinuteVN(iso);
  if (!hm) return iso;
  const timePhrase = vnPickupTimePhrase(hm.hour);
  const dayPart = formatPickupDayRelativeLowerVi(iso, refDate);
  return `${timePhrase} ${dayPart}`;
}

/**
 * Thời gian đơn ship: "14:30 · hôm nay" (múi VN, ngày tương đối như admin).
 */
export function formatShipOrderRequestedAt(
  iso: string,
  refDate: Date = new Date(),
): string {
  const hm = pickupHourMinuteVN(iso);
  if (!hm) return iso;
  const time = `${pad2(hm.hour)}:${pad2(hm.minute)}`;
  const dayPart = formatPickupDayRelativeLowerVi(iso, refDate);
  return `${time} · ${dayPart}`;
}

/** datetime-local (VN) → hiển thị HH:mm, dd/mm/yyyy. */
export function formatPickupAtLocalVi(local: string): string {
  try {
    const { datePart, totalMinutes } = pickupLocalParts(local);
    const [y, m, d] = datePart.split("-");
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${pad2(hour)}:${pad2(minute)}, ${d}/${m}/${y}`;
  } catch {
    const [datePart, timePart] = local.split("T");
    if (datePart && timePart) {
      const [y, m, d] = datePart.split("-");
      return `${timePart}, ${d}/${m}/${y}`;
    }
    return local.replace("T", ", ");
  }
}
