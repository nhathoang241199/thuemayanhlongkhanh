import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingSlot, CameraBrand } from '../../generated/prisma/enums';
import {
  assertDateStr,
  bookingCoversCalendarDayVN,
  canAddSlot,
  dayCountInclusive,
  eachCalendarDayVN,
  MAX_BOOKING_RANGE_DAYS,
  OCCUPYING_STATUSES,
  remainingForSlot,
  todayCalendarDayVN,
} from '../common/booking-schedule';
import { PrismaService } from '../prisma/prisma.service';

type SlotCounts = { m: number; a: number; e: number; fd: number };

const ALL_SLOTS: BookingSlot[] = [
  BookingSlot.MORNING,
  BookingSlot.AFTERNOON,
  BookingSlot.EVENING,
  BookingSlot.FULL_DAY,
];

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCameraQuantity(cameraId: string): Promise<number> {
    const camera = await this.prisma.camera.findUnique({
      where: { id: cameraId },
      select: { quantity: true },
    });
    if (!camera) {
      throw new NotFoundException(`Camera ${cameraId} not found`);
    }
    return camera.quantity;
  }

  private async getOccupyingBookings(cameraId: string) {
    return this.prisma.booking.findMany({
      where: {
        cameraId,
        status: { in: OCCUPYING_STATUSES },
      },
      select: {
        id: true,
        slot: true,
        startBookingDate: true,
        endBookingDate: true,
      },
    });
  }

  private countsForDay(
    bookings: Awaited<ReturnType<AvailabilityService['getOccupyingBookings']>>,
    dateStr: string,
    excludeBookingId?: string,
  ): SlotCounts {
    const c: SlotCounts = { m: 0, a: 0, e: 0, fd: 0 };
    for (const b of bookings) {
      if (excludeBookingId && b.id === excludeBookingId) continue;
      if (
        !bookingCoversCalendarDayVN(
          b.startBookingDate,
          b.endBookingDate,
          dateStr,
        )
      ) {
        continue;
      }
      switch (b.slot) {
        case BookingSlot.MORNING:
          c.m++;
          break;
        case BookingSlot.AFTERNOON:
          c.a++;
          break;
        case BookingSlot.EVENING:
          c.e++;
          break;
        case BookingSlot.FULL_DAY:
          c.fd++;
          break;
      }
    }
    return c;
  }

  validateDateRange(startDate: string, endDate: string): void {
    assertDateStr(startDate);
    assertDateStr(endDate);
    if (endDate < startDate) {
      throw new BadRequestException('endDate phải >= startDate');
    }
    const today = todayCalendarDayVN();
    if (startDate < today) {
      throw new BadRequestException('Không thể chọn ngày trong quá khứ');
    }
    const days = dayCountInclusive(startDate, endDate);
    if (days > MAX_BOOKING_RANGE_DAYS) {
      throw new BadRequestException(
        `Tối đa ${MAX_BOOKING_RANGE_DAYS} ngày mỗi đơn`,
      );
    }
  }

  validateSlotForRange(
    startDate: string,
    endDate: string,
    slot: BookingSlot,
  ): void {
    const days = dayCountInclusive(startDate, endDate);
    if (days >= 2 && slot !== BookingSlot.FULL_DAY) {
      throw new BadRequestException(
        'Thuê từ 2 ngày trở lên chỉ được chọn buổi Cả ngày',
      );
    }
  }

  async isSlotAvailable(
    cameraId: string,
    dateStr: string,
    slot: BookingSlot,
    excludeBookingId?: string,
  ): Promise<{ available: boolean; remaining: number }> {
    assertDateStr(dateStr);
    const quantity = await this.getCameraQuantity(cameraId);
    const bookings = await this.getOccupyingBookings(cameraId);
    const { m, a, e, fd } = this.countsForDay(
      bookings,
      dateStr,
      excludeBookingId,
    );
    const available = canAddSlot(slot, m, a, e, fd, quantity);
    const remaining = remainingForSlot(slot, m, a, e, fd, quantity);
    return { available, remaining };
  }

  async isRangeAvailable(
    cameraId: string,
    startDate: string,
    endDate: string,
    slot: BookingSlot,
    excludeBookingId?: string,
  ): Promise<{ available: boolean; days: { date: string; available: boolean }[] }> {
    this.validateDateRange(startDate, endDate);
    this.validateSlotForRange(startDate, endDate, slot);
    const days = eachCalendarDayVN(startDate, endDate);
    const results: { date: string; available: boolean }[] = [];
    let allOk = true;
    for (const d of days) {
      const r = await this.isSlotAvailable(
        cameraId,
        d,
        slot,
        excludeBookingId,
      );
      results.push({ date: d, available: r.available });
      if (!r.available) allOk = false;
    }
    return { available: allOk, days: results };
  }

  async calendarMonth(
    cameraId: string,
    year: number,
    month: number,
    excludeBookingId?: string,
  ) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be 1-12');
    }
    const quantity = await this.getCameraQuantity(cameraId);
    const bookings = await this.getOccupyingBookings(cameraId);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const days: {
      date: string;
      available: boolean;
      slots: Record<BookingSlot, { available: boolean; remaining: number }>;
    }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const { m, a, e, fd } = this.countsForDay(
        bookings,
        dateStr,
        excludeBookingId,
      );
      const slots = {} as Record<
        BookingSlot,
        { available: boolean; remaining: number }
      >;
      let anyAvailable = false;
      for (const slot of ALL_SLOTS) {
        const available = canAddSlot(slot, m, a, e, fd, quantity);
        const remaining = remainingForSlot(slot, m, a, e, fd, quantity);
        slots[slot] = { available, remaining };
        if (available) anyAvailable = true;
      }
      days.push({ date: dateStr, available: anyAvailable, slots });
    }
    return { year, month, days };
  }

  async slotsForDate(
    cameraId: string,
    date: string,
    excludeBookingId?: string,
  ) {
    assertDateStr(date);
    const quantity = await this.getCameraQuantity(cameraId);
    const bookings = await this.getOccupyingBookings(cameraId);
    const { m, a, e, fd } = this.countsForDay(
      bookings,
      date,
      excludeBookingId,
    );
    const slots = {} as Record<
      BookingSlot,
      { available: boolean; remaining: number }
    >;
    for (const slot of ALL_SLOTS) {
      slots[slot] = {
        available: canAddSlot(slot, m, a, e, fd, quantity),
        remaining: remainingForSlot(slot, m, a, e, fd, quantity),
      };
    }
    return { date, slots };
  }

  private slotsToCheckForRange(
    startDate: string,
    endDate: string,
  ): BookingSlot[] {
    const days = dayCountInclusive(startDate, endDate);
    return days >= 2 ? [BookingSlot.FULL_DAY] : ALL_SLOTS;
  }

  async rangeSlotsAvailability(
    cameraId: string,
    startDate: string,
    endDate: string,
    excludeBookingId?: string,
  ): Promise<{
    slots: Record<BookingSlot, { available: boolean }>;
  }> {
    this.validateDateRange(startDate, endDate);
    const check = this.slotsToCheckForRange(startDate, endDate);
    const slots = {} as Record<BookingSlot, { available: boolean }>;
    for (const slot of ALL_SLOTS) {
      if (!check.includes(slot)) {
        slots[slot] = { available: false };
        continue;
      }
      const { available } = await this.isRangeAvailable(
        cameraId,
        startDate,
        endDate,
        slot,
        excludeBookingId,
      );
      slots[slot] = { available };
    }
    return { slots };
  }

  async rangeSlotsAnyAvailability(
    startDate: string,
    endDate: string,
    brand?: CameraBrand,
    excludeBookingId?: string,
  ): Promise<{
    slots: Record<BookingSlot, { available: boolean }>;
  }> {
    this.validateDateRange(startDate, endDate);
    const check = this.slotsToCheckForRange(startDate, endDate);
    const cameras = await this.prisma.camera.findMany({
      where: brand ? { brand } : undefined,
      orderBy: { name: 'asc' },
    });
    const slots = {} as Record<BookingSlot, { available: boolean }>;
    for (const slot of ALL_SLOTS) {
      if (!check.includes(slot)) {
        slots[slot] = { available: false };
        continue;
      }
      let anyAvailable = false;
      for (const cam of cameras) {
        const { available } = await this.isRangeAvailable(
          cam.id,
          startDate,
          endDate,
          slot,
          excludeBookingId,
        );
        if (available) {
          anyAvailable = true;
          break;
        }
      }
      slots[slot] = { available: anyAvailable };
    }
    return { slots };
  }

  async camerasForSlot(
    brand: CameraBrand | undefined,
    startDate: string,
    endDate: string,
    slot: BookingSlot,
    excludeBookingId?: string,
  ) {
    this.validateDateRange(startDate, endDate);
    this.validateSlotForRange(startDate, endDate, slot);
    const cameras = await this.prisma.camera.findMany({
      where: brand ? { brand } : undefined,
      orderBy: [{ dayPrice: 'desc' }, { shiftPrice: 'desc' }, { name: 'asc' }],
    });
    const result: {
      id: string;
      brand: CameraBrand;
      name: string;
      quantity: number;
      dayPrice: number;
      shiftPrice: number;
      imageUrl: string | null;
      available: boolean;
    }[] = [];
    for (const cam of cameras) {
      const { available } = await this.isRangeAvailable(
        cam.id,
        startDate,
        endDate,
        slot,
        excludeBookingId,
      );
      result.push({
        id: cam.id,
        brand: cam.brand,
        name: cam.name,
        quantity: cam.quantity,
        dayPrice: cam.dayPrice,
        shiftPrice: cam.shiftPrice,
        imageUrl: cam.imageUrl,
        available,
      });
    }
    return result;
  }
}
