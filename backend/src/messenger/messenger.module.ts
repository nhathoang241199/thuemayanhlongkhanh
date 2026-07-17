import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiServiceClient } from './ai-service.client';
import { ConversationService } from './conversation.service';
import { FacebookGraphService } from './facebook-graph.service';
import { MessengerWebhookController } from './messenger.webhook.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MessengerWebhookController],
  providers: [FacebookGraphService, AiServiceClient, ConversationService],
})
export class MessengerModule {}
