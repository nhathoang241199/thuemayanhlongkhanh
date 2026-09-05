import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { ShipOrderModule } from '../ship-order/ship-order.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopFeaturesModule } from '../shop-features/shop-features.module';
import { StatsModule } from '../stats/stats.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [
    PrismaModule,
    AvailabilityModule,
    StatsModule,
    ShopFeaturesModule,
    ShipOrderModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
