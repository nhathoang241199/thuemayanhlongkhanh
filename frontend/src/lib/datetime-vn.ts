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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** datetime-local value (VN wall clock) từ YYYY-MM-DD + giờ. */
export function toDatetimeLocalValue(
  dateStr: string,
  hour: number,
  minute = 0,
): string {
  return `${dateStr}T${pad2(hour)}:${pad2(minute)}`;
}

export function slotPickupBounds(
  startDate: string,
  slot: BookingSlot,
): { minLocal: string; maxLocal: string; defaultLocal: string } {
  const w = SLOT_TIME_WINDOWS[slot];
  return {
    minLocal: toDatetimeLocalValue(startDate, w.startHour, 0),
    maxLocal: toDatetimeLocalValue(startDate, w.endHour, 0),
    defaultLocal: toDatetimeLocalValue(startDate, w.startHour, 0),
  };
}

/** Coi chuỗi datetime-local là giờ VN (UTC+7) → ISO UTC. */
export function datetimeLocalToIso(local: string): string {
  const [datePart, timePart] = local.split("T");
  if (!datePart || !timePart) {
    throw new Error("Thời gian nhận máy không hợp lệ");
  }
  const [y, m, d] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(
    Date.UTC(y, m - 1, d, hour - 7, minute ?? 0, 0, 0),
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
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCDay() === 0;
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
