export function bookingStatusLabel(status: string): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Chờ thanh toán";
    case "CONFIRMED":
      return "Chờ lấy máy";
    case "RENTING":
      return "Đang thuê";
    case "LATE_RETURN":
      return "Trả trễ";
    case "COMPLETED":
      return "Hoàn tất";
    case "PENDING_REFUND_CANCEL":
      return "Chờ hoàn tiền hủy lịch";
    case "PENDING_REFUND_CHANGE":
      return "Chờ hoàn tiền thay đổi";
    case "PENDING_CHANGE_PAYMENT":
      return "Chờ chuyển thêm";
    case "CANCELLED":
      return "Đã hủy";
    case "REFUNDED":
      return "Đã hoàn tiền";
    default:
      return status;
  }
}

export function bookingStatusColor(
  status: string,
): "gray" | "green" | "red" | "orange" | "cerulean" | "purple" {
  switch (status) {
    case "PENDING_PAYMENT":
      return "orange";
    case "CONFIRMED":
      return "purple";
    case "RENTING":
      return "cerulean";
    case "LATE_RETURN":
      return "red";
    case "COMPLETED":
      return "green";
    case "PENDING_REFUND_CANCEL":
    case "PENDING_REFUND_CHANGE":
      return "orange";
    case "PENDING_CHANGE_PAYMENT":
      return "purple";
    case "CANCELLED":
      return "red";
    case "REFUNDED":
      return "green";
    default:
      return "gray";
  }
}

/** Đồng bộ với backend SLOT_TIME_WINDOWS (booking-schedule.ts). */
/** Phụ phí giao & trả máy tận nơi — đồng bộ backend booking-schedule.ts */
export const DELIVERY_FEE_VND = 40_000;

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

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatBookingRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return startIso;
  }
  return `${dateFmt.format(start)} → ${dateFmt.format(end)}`;
}
