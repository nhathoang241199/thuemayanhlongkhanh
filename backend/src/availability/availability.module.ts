import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopClosureModule } from '../shop-closure/shop-closure.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [PrismaModule, ShopClosureModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
