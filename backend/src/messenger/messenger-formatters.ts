import { BookingSlot, CameraBrand } from '../../generated/prisma/enums';

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

/** 840000 → "840k", 1200000 → "1.2tr" */
export function formatVndShort(amount: number): string {
  if (amount >= 1_000_000) {
    const tr = amount / 1_000_000;
    return Number.isInteger(tr) ? `${tr}tr` : `${tr.toFixed(1).replace(/\.0$/, '')}tr`;
  }
  return `${Math.round(amount / 1000)}k`;
}

export function formatCameraList(
  cameras: {
    id: string;
    brand: string;
    name: string;
    dayPrice: number;
    shiftPrice: number;
    discountPercent: number;
    available?: boolean;
  }[],
): string {
  if (cameras.length === 0) return 'Hiện không có máy nào trong danh sách.';
  return cameras
    .map((c) => {
      const discount =
        c.discountPercent > 0 ? ` (giảm ${c.discountPercent}%)` : '';
      const avail =
        c.available === undefined
          ? ''
          : c.available
            ? ' — còn trống'
            : ' — hết lịch';
      return `- ${c.brand} ${c.name} (id: ${c.id}): ngày ${formatVnd(c.dayPrice)}, buổi ${formatVnd(c.shiftPrice)}${discount}${avail}`;
    })
    .join('\n');
}

export function formatLensList(
  lenses: {
    id: string;
    name: string;
    dayPrice: number;
    shiftPrice: number;
    discountPercent: number;
  }[],
): string {
  if (lenses.length === 0) return 'Không có lens phù hợp cho máy này.';
  return lenses
    .map(
      (l) =>
        `- ${l.name} (id: ${l.id}): ngày ${formatVnd(l.dayPrice)}, buổi ${formatVnd(l.shiftPrice)}` +
        (l.discountPercent > 0 ? ` (giảm ${l.discountPercent}%)` : ''),
    )
    .join('\n');
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
