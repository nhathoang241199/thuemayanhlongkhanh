import { Injectable } from '@nestjs/common';
import {
  BookingStatus,
  PaymentStatus,
} from '../../generated/prisma/enums';
import { AvailabilityService } from '../availability/availability.service';
import { toCalendarDayVN } from '../common/booking-schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
  ) {}

  /** Xác nhận cọc 50k SePay → giữ lịch, chưa thu phần còn lại. */
  async confirmBookingAfterPayment(bookingId: string): Promise<boolean> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking || booking.status !== BookingStatus.PENDING_PAYMENT) {
      return false;
    }

    const startDate = toCalendarDayVN(booking.startBookingDate);
    const endDate = toCalendarDayVN(booking.endBookingDate);
    const { available } = await this.availability.isRangeAvailable(
      booking.cameraId,
      startDate,
      endDate,
      booking.slot,
      booking.id,
    );
    if (!available) {
      return false;
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: PaymentStatus.DEPOSITED,
        status: BookingStatus.CONFIRMED,
      },
    });
    return true;
  }
}
