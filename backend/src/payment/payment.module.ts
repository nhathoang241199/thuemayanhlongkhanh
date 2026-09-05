import { forwardRef, Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShipOrderModule } from '../ship-order/ship-order.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SepayService } from './sepay.service';
import { TelegramBookingNotificationService } from './telegram-booking-notification';

@Module({
  imports: [
    PrismaModule,
    AvailabilityModule,
    forwardRef(() => ShipOrderModule),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, SepayService, TelegramBookingNotificationService],
  exports: [PaymentService, SepayService, TelegramBookingNotificationService],
})
export class PaymentModule {}
