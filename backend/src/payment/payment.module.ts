import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingModule } from '../booking/booking.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SepayService } from './sepay.service';

@Module({
  imports: [PrismaModule, AvailabilityModule, BookingModule],
  controllers: [PaymentController],
  providers: [PaymentService, SepayService],
  exports: [PaymentService, SepayService],
})
export class PaymentModule {}
