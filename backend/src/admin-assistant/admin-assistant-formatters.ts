import { BookingSlot, CameraBrand } from '../../generated/prisma/enums';

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

export function parseBrand(value?: string): CameraBrand | undefined {
  if (!value?.trim()) return undefined;
  const upper = value.trim().toUpperCase();
  if (upper in CameraBrand) return upper as CameraBrand;
  return undefined;
}

export function parseSlot(value?: string): BookingSlot {
  const slot = value?.trim().toUpperCase();
  if (slot && slot in BookingSlot) return slot as BookingSlot;
  return BookingSlot.FULL_DAY;
}

export function parseYearMonth(
  year?: unknown,
  month?: unknown,
): { year: number; month: number } | null {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  if (y < 2000 || y > 2100 || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

export function formatCameraInventoryList(
  cameras: {
    brand: string;
    name: string;
    quantity: number;
    dayPrice: number;
    shiftPrice: number;
    discountPercent: number;
    available?: boolean;
  }[],
): string {
  if (cameras.length === 0) return 'Không có máy nào.';
  return cameras
    .map((c) => {
      const discount =
        c.discountPercent > 0 ? `, giảm ${c.discountPercent}%` : '';
      const avail =
        c.available === undefined
          ? ''
          : c.available
            ? ', còn trống'
            : ', hết lịch';
      return `- ${c.brand} ${c.name}: ${c.quantity} máy, giá ngày ${formatVnd(c.dayPrice)}, buổi ${formatVnd(c.shiftPrice)}${discount}${avail}`;
    })
    .join('\n');
}

export function formatLensInventoryList(
  lenses: {
    name: string;
    quantity: number;
    dayPrice: number;
    shiftPrice: number;
    discountPercent: number;
  }[],
): string {
  if (lenses.length === 0) return 'Không có lens nào.';
  return lenses
    .map(
      (l) =>
        `- ${l.name}: ${l.quantity} cái, ngày ${formatVnd(l.dayPrice)}, buổi ${formatVnd(l.shiftPrice)}` +
        (l.discountPercent > 0 ? `, giảm ${l.discountPercent}%` : ''),
    )
    .join('\n');
}
