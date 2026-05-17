import { Injectable } from '@nestjs/common';
import {
  BookingStatus,
  PaymentStatus,
} from '../../generated/prisma/enums';
import { AvailabilityService } from '../availability/availability.service';
import { BookingService } from '../booking/booking.service';
import { toCalendarDayVN } from '../common/booking-schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly bookingService: BookingService,
  ) {}

  async confirmBookingAfterPayment(bookingId: string): Promise<boolean> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) return false;

    if (booking.status === BookingStatus.PENDING_CHANGE_PAYMENT) {
      return this.bookingService.confirmChangePayment(bookingId);
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
        paymentStatus: PaymentStatus.PAID,
        status: BookingStatus.CONFIRMED,
      },
    });
    return true;
  }
}
