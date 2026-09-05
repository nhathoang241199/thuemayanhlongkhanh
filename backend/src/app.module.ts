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
import { ShopInfoModule } from './shop-info/shop-info.module';
import { ShopFeaturesModule } from './shop-features/shop-features.module';
import { StatsModule } from './stats/stats.module';
import { MessengerModule } from './messenger/messenger.module';
import { HermesModule } from './hermes/hermes.module';
import { BlogPostModule } from './blog-post/blog-post.module';
import { FanpagePostModule } from './fanpage-post/fanpage-post.module';
import { ShipOrderModule } from './ship-order/ship-order.module';
import { ShipperModule } from './shipper/shipper.module';

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
    ShopInfoModule,
    ShopFeaturesModule,
    StatsModule,
    MessengerModule,
    HermesModule,
    FanpagePostModule,
    BlogPostModule,
    ShipOrderModule,
    ShipperModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
