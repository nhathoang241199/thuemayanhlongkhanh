import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShipperController } from './shipper.controller';
import { ShipperPushService } from './shipper-push.service';
import { ShipperService } from './shipper.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShipperController],
  providers: [ShipperService, ShipperPushService],
  exports: [ShipperService, ShipperPushService],
})
export class ShipperModule {}
