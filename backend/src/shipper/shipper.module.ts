import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShipperController } from './shipper.controller';
import { ShipperService } from './shipper.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShipperController],
  providers: [ShipperService],
  exports: [ShipperService],
})
export class ShipperModule {}
