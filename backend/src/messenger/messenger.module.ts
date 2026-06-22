import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingTermsModule } from '../booking-terms/booking-terms.module';
import { CameraModule } from '../camera/camera.module';
import { LensModule } from '../lens/lens.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopClosureModule } from '../shop-closure/shop-closure.module';
import { ClaudeService } from './claude.service';
import { ConversationService } from './conversation.service';
import { FacebookGraphService } from './facebook-graph.service';
import { MessengerToolsService } from './messenger-tools.service';
import { MessengerWebhookController } from './messenger.webhook.controller';

@Module({
  imports: [
    PrismaModule,
    CameraModule,
    LensModule,
    AvailabilityModule,
    BookingTermsModule,
    ShopClosureModule,
  ],
  controllers: [MessengerWebhookController],
  providers: [
    FacebookGraphService,
    MessengerToolsService,
    ClaudeService,
    ConversationService,
  ],
})
export class MessengerModule {}
