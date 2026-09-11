import { forwardRef, Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { MessengerModule } from '../messenger/messenger.module';
import { PaymentModule } from '../payment/payment.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShipperModule } from '../shipper/shipper.module';
import { ShipOrderController } from './ship-order.controller';
import { ShipOrderService } from './ship-order.service';

@Module({
  imports: [
    PrismaModule,
    CustomerModule,
    forwardRef(() => PaymentModule),
    MessengerModule,
    ShipperModule,
  ],
  controllers: [ShipOrderController],
  providers: [ShipOrderService],
  exports: [ShipOrderService],
})
export class ShipOrderModule {}
