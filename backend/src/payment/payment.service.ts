import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  BookingStatus,
  PaymentStatus,
} from '../../generated/prisma/enums';
import { AvailabilityService } from '../availability/availability.service';
import { toCalendarDayVN } from '../common/booking-schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ShipOrderService } from '../ship-order/ship-order.service';
import { TelegramBookingNotificationService } from './telegram-booking-notification';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly telegram: TelegramBookingNotificationService,
    @Inject(forwardRef(() => ShipOrderService))
    private readonly shipOrderService: ShipOrderService,
  ) {}

  /** Xác nhận cọc 50k SePay → giữ lịch, chưa thu phần còn lại. */
  async confirmBookingAfterPayment(bookingId: string): Promise<boolean> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { name: true, phone: true } },
        camera: { select: { name: true } },
      },
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
      console.warn(
        `[payment] Không confirm cọc booking ${bookingId}: slot không còn trống`,
      );
      return false;
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: PaymentStatus.DEPOSITED,
        status: BookingStatus.CONFIRMED,
      },
    });

    const pickupAt = booking.pickupAt ?? booking.startBookingDate;
    this.telegram
      .notifyNewDeposit({
        customer: booking.customer,
        camera: booking.camera,
        pickupAt,
        note: booking.note,
        shippingAddress: booking.shippingAddress,
      })
      .catch((err) => {
        console.warn('[telegram] notifyNewDeposit failed', err);
      });

    if (booking.shippingAddress?.trim()) {
      this.shipOrderService
        .ensureOutboundForBookingId(bookingId)
        .catch((err) => {
          console.warn('[ship-order] ensureOutbound failed', err);
        });
    }

    return true;
  }
}
