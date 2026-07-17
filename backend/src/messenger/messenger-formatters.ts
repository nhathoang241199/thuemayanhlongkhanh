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

/**
 * Nhãn ngắn cho báo giá — lấy từ `Camera.name` (admin đặt tên ngắn: m50, xt30, pocket 3…).
 * Chỉ chuẩn hóa cách viết hoa; thêm/xóa máy không cần sửa code.
 */
export function cameraModelShortLabel(_brand: string, name: string): string {
  const s = name.trim().replace(/\s+/g, ' ');

  if (/^pocket\s*(\d+)$/i.test(s)) {
    return `Pocket ${s.match(/^pocket\s*(\d+)$/i)![1]}`;
  }
  const canon = s.match(/^([rm])(\d+)(?:\s+ii)?$/i);
  if (canon) {
    return `${canon[1].toUpperCase()}${canon[2]}${/\s+ii$/i.test(s) ? ' II' : ''}`;
  }
  const xt = s.match(/^xt(\d+)$/i);
  if (xt) return `XT${xt[1]}`;
  const xs = s.match(/^xs(\d+)$/i);
  if (xs) return `XS${xs[1]}`;
  const xtDash = s.match(/^x-t(\d+)$/i);
  if (xtDash) return `X-T${xtDash[1]}`;
  if (/^x100vi$/i.test(s)) return 'X100VI';

  return s
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function formatCameraPriceTemplate(
  brand: string,
  name: string,
  dayCount: number,
  totalVnd: number,
): string {
  return `Mẫu trả lời: ${cameraModelShortLabel(brand, name)} ${dayCount} ngày ${formatVndShort(totalVnd)} nhé ạ.`;
}

type CameraListRow = {
  id: string;
  brand: string;
  name: string;
  dayPrice: number;
  shiftPrice: number;
  discountPercent: number;
  available?: boolean;
};

export function formatCameraList(
  cameras: CameraListRow[],
  options?: { oneDayPriceTemplate?: boolean },
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
      let line = `- ${c.brand} ${c.name} (id: ${c.id}): ngày ${formatVnd(c.dayPrice)}, buổi ${formatVnd(c.shiftPrice)}${discount}${avail}`;
      if (options?.oneDayPriceTemplate) {
        const oneDayTotal = Math.round(
          c.dayPrice * (1 - Math.max(0, c.discountPercent) / 100),
        );
        line += `\n  ${formatCameraPriceTemplate(c.brand, c.name, 1, oneDayTotal)}`;
      }
      return line;
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
