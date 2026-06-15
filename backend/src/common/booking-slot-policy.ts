import { BadRequestException } from '@nestjs/common';
import { BookingSlot } from '../../generated/prisma/enums';

const SLOT_LABEL_VI: Record<BookingSlot, string> = {
  [BookingSlot.FULL_DAY]: 'Cả ngày',
  [BookingSlot.MORNING]: 'Sáng',
  [BookingSlot.AFTERNOON]: 'Chiều',
  [BookingSlot.EVENING]: 'Tối',
};

/** Danh sách buổi cho phép — `BOOKING_ALLOWED_SLOTS=FULL_DAY` (mặc định: tất cả). */
export function getAllowedBookingSlots(): BookingSlot[] | null {
  const raw = process.env.BOOKING_ALLOWED_SLOTS?.trim();
  if (!raw) return null;

  const allowed = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const valid = Object.values(BookingSlot);
  const parsed: BookingSlot[] = [];
  for (const slot of allowed) {
    if (!valid.includes(slot as BookingSlot)) {
      throw new Error(`BOOKING_ALLOWED_SLOTS: giá trị không hợp lệ "${slot}"`);
    }
    parsed.push(slot as BookingSlot);
  }
  if (parsed.length === 0) {
    throw new Error('BOOKING_ALLOWED_SLOTS: cần ít nhất một buổi');
  }
  return parsed;
}

export function assertBookingSlotAllowed(slot: BookingSlot): void {
  const allowed = getAllowedBookingSlots();
  if (!allowed) return;
  if (allowed.includes(slot)) return;

  const labels = allowed.map((s) => SLOT_LABEL_VI[s]).join(', ');
  throw new BadRequestException(
    `Shop chỉ nhận đặt buổi: ${labels}`,
  );
}
