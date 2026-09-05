import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShipperModule } from '../shipper/shipper.module';
import { AiServiceClient } from './ai-service.client';
import { ConversationService } from './conversation.service';
import { FacebookGraphService } from './facebook-graph.service';
import { MessengerLearnController } from './messenger-learn.controller';
import { MessengerLearnService } from './messenger-learn.service';
import { MessengerWebhookController } from './messenger.webhook.controller';
import { ShipperMessengerNotifyService } from './shipper-messenger-notify.service';

@Module({
  imports: [PrismaModule, ShipperModule],
  controllers: [MessengerWebhookController, MessengerLearnController],
  providers: [
    FacebookGraphService,
    AiServiceClient,
    ConversationService,
    MessengerLearnService,
    ShipperMessengerNotifyService,
  ],
  exports: [FacebookGraphService, ShipperMessengerNotifyService],
})
export class MessengerModule {}
