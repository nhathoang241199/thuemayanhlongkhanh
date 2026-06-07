import { apiBase } from "./api";

export type CameraBrand = "CANON" | "FUJIFILM" | "DJI";
export type BookingSlot =
  | "FULL_DAY"
  | "MORNING"
  | "AFTERNOON"
  | "EVENING";

export type PublicCamera = {
  id: string;
  brand: CameraBrand;
  name: string;
  quantity: number;
  dayPrice: number;
  shiftPrice: number;
  discountPercent: number;
  imageUrl: string | null;
};

export type PublicCameraDetail = PublicCamera & {
  tutorialVideoUrl: string | null;
};

export type PublicLens = {
  id: string;
  name: string;
  quantity: number;
  dayPrice: number;
  shiftPrice: number;
  discountPercent: number;
  imageUrl: string | null;
};

export type RentalPickerItem = Pick<
  PublicCamera,
  "id" | "name" | "dayPrice" | "shiftPrice" | "discountPercent" | "imageUrl"
>;

export type CalendarDay = {
  date: string;
  available: boolean;
  closed?: boolean;
  slots?: Record<
    BookingSlot,
    { available: boolean; remaining: number }
  >;
};

export type SlotAvailability = {
  date: string;
  slots: Record<
    BookingSlot,
    { available: boolean; remaining: number }
  >;
};

export type CameraWithAvailability = PublicCamera & { available: boolean };

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as T;
}

export async function fetchPublicCameras(
  brand?: CameraBrand,
): Promise<PublicCamera[]> {
  const params = new URLSearchParams();
  if (brand) params.set("brand", brand);
  const res = await fetch(`${apiBase()}/api/cameras/public?${params}`);
  return parseJson(res);
}

export async function fetchBrandsWithCameras(): Promise<CameraBrand[]> {
  const res = await fetch(`${apiBase()}/api/cameras/public/brands`);
  return parseJson(res);
}

export async function fetchPublicLenses(
  cameraId: string,
): Promise<PublicLens[]> {
  const params = new URLSearchParams({ cameraId });
  const res = await fetch(`${apiBase()}/api/lenses/public?${params}`);
  return parseJson(res);
}

export async function fetchPublicCamera(
  id: string,
): Promise<PublicCameraDetail> {
  const res = await fetch(`${apiBase()}/api/cameras/public/${encodeURIComponent(id)}`);
  return parseJson(res);
}

export async function fetchCalendarMonth(
  cameraId: string,
  year: number,
  month: number,
  excludeBookingId?: string,
): Promise<{ year: number; month: number; days: CalendarDay[] }> {
  const params = new URLSearchParams({
    cameraId,
    year: String(year),
    month: String(month),
  });
  if (excludeBookingId) params.set("excludeBookingId", excludeBookingId);
  const res = await fetch(`${apiBase()}/api/availability/calendar?${params}`);
  return parseJson(res);
}

export type ClosedMonthDay = {
  date: string;
  closed: boolean;
};

export async function fetchClosedMonth(
  year: number,
  month: number,
): Promise<{ year: number; month: number; days: ClosedMonthDay[] }> {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  const res = await fetch(`${apiBase()}/api/availability/closed-month?${params}`);
  return parseJson(res);
}

export async function fetchSlots(
  cameraId: string,
  date: string,
  excludeBookingId?: string,
): Promise<SlotAvailability> {
  const params = new URLSearchParams({ cameraId, date });
  if (excludeBookingId) params.set("excludeBookingId", excludeBookingId);
  const res = await fetch(`${apiBase()}/api/availability/slots?${params}`);
  return parseJson(res);
}

export type RangeSlotsAvailability = {
  slots: Record<BookingSlot, { available: boolean }>;
};

export async function fetchRangeAvailability(
  cameraId: string,
  startDate: string,
  endDate: string,
  slot: BookingSlot,
  excludeBookingId?: string,
): Promise<{ available: boolean; days: { date: string; available: boolean }[] }> {
  const params = new URLSearchParams({
    cameraId,
    startDate,
    endDate,
    slot,
  });
  if (excludeBookingId) params.set("excludeBookingId", excludeBookingId);
  const res = await fetch(`${apiBase()}/api/availability/range?${params}`);
  return parseJson(res);
}

export async function fetchRangeSlotsAvailability(
  cameraId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string,
): Promise<RangeSlotsAvailability> {
  const params = new URLSearchParams({
    cameraId,
    startDate,
    endDate,
  });
  if (excludeBookingId) params.set("excludeBookingId", excludeBookingId);
  const res = await fetch(
    `${apiBase()}/api/availability/range-slots?${params}`,
  );
  return parseJson(res);
}

export async function fetchRangeSlotsAnyAvailability(
  startDate: string,
  endDate: string,
  excludeBookingId?: string,
): Promise<RangeSlotsAvailability> {
  const params = new URLSearchParams({ startDate, endDate });
  if (excludeBookingId) params.set("excludeBookingId", excludeBookingId);
  const res = await fetch(
    `${apiBase()}/api/availability/range-slots-any?${params}`,
  );
  return parseJson(res);
}

export async function fetchCamerasForRange(
  startDate: string,
  endDate: string,
  slot: BookingSlot,
  brand?: CameraBrand,
  excludeBookingId?: string,
): Promise<CameraWithAvailability[]> {
  const params = new URLSearchParams({ startDate, endDate, slot });
  if (brand) params.set("brand", brand);
  if (excludeBookingId) params.set("excludeBookingId", excludeBookingId);
  const res = await fetch(`${apiBase()}/api/availability/cameras?${params}`);
  return parseJson(res);
}

export type CustomerBooking = {
  id: string;
  bookingCode: string;
  amount: number;
  status: string;
  paymentStatus: string;
};

export async function createCustomerBooking(body: {
  customerId: string;
  cameraId: string;
  lensId?: string | null;
  startDate: string;
  endDate: string;
  slot: BookingSlot;
  pickupAt: string;
  returnNextMorning?: boolean;
  note?: string;
  shippingAddress?: string;
}): Promise<CustomerBooking> {
  const res = await fetch(`${apiBase()}/api/bookings/customer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export type SepayInstructions = {
  bookingId: string;
  bookingCode: string;
  cameraId?: string;
  amount: number;
  totalAmount?: number;
  depositAmount?: number;
  balanceDue?: number;
  status: string;
  paymentStatus?: string;
  paymentKind?: "DEPOSIT" | "DEPOSIT_DONE";
  alreadyPaid: boolean;
  depositPaid?: boolean;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  bankBin?: string;
  transferContent?: string;
  qrImageUrl?: string;
  shippingAddress?: string | null;
};

export async function fetchSepayInstructions(
  bookingId: string,
  phone: string,
): Promise<SepayInstructions> {
  const params = new URLSearchParams({ bookingId, phone });
  const res = await fetch(
    `${apiBase()}/api/payments/sepay/instructions?${params}`,
  );
  return parseJson(res);
}

export function dayCountInclusive(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  return diff + 1;
}

export function formatDateVi(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

/** Nhãn ngày trên UI đặt lịch: 1 ngày chỉ hiện một ngày; từ 2 ngày hiện khoảng + (N ngày). */
export function formatBookingRangeLabel(
  startDate: string,
  endDate: string,
  dayCount: number,
): string {
  if (!startDate || !endDate) return "—";
  if (dayCount <= 1 || startDate === endDate) {
    return formatDateVi(startDate);
  }
  return `${formatDateVi(startDate)} – ${formatDateVi(endDate)} (${dayCount} ngày)`;
}
