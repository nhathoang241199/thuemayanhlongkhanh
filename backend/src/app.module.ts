import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingModule } from './booking/booking.module';
import { BookingTermsModule } from './booking-terms/booking-terms.module';
import { CameraModule } from './camera/camera.module';
import { LensModule } from './lens/lens.module';
import { CustomerModule } from './customer/customer.module';
import { ExpenseModule } from './expense/expense.module';
import { PrismaModule } from './prisma/prisma.module';
import { PaymentModule } from './payment/payment.module';
import { ShopClosureModule } from './shop-closure/shop-closure.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    CameraModule,
    LensModule,
    CustomerModule,
    BookingModule,
    BookingTermsModule,
    AvailabilityModule,
    PaymentModule,
    ExpenseModule,
    ShopClosureModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
