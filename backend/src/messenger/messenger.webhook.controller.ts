import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { Public } from '../auth/public.decorator';
import { ConversationService } from './conversation.service';
import {
  getMessengerConfig,
  isMessengerConfigured,
} from './messenger.config';
import type { MessengerWebhookBody } from './messenger.types';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Public()
@ApiTags('messenger')
@Controller('messenger')
export class MessengerWebhookController {
  private readonly logger = new Logger(MessengerWebhookController.name);

  constructor(private readonly conversation: ConversationService) {}

  @Get('webhook')
  @ApiOperation({ summary: 'Facebook webhook verify' })
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const { verifyToken } = getMessengerConfig();
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    throw new ForbiddenException('Verify token không hợp lệ');
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Facebook Messenger webhook' })
  receive(
    @Body() body: MessengerWebhookBody,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: RawBodyRequest,
  ) {
    this.verifySignature(req.rawBody, signature);
    if (!isMessengerConfigured()) {
      this.logger.warn('Webhook nhận event nhưng bot chưa cấu hình');
      return 'EVENT_RECEIVED';
    }
    this.conversation.handleWebhookAsync(body);
    return 'EVENT_RECEIVED';
  }

  private verifySignature(rawBody: Buffer | undefined, signature?: string) {
    const { appSecret } = getMessengerConfig();
    if (!appSecret) return;
    if (!signature || !rawBody) {
      throw new ForbiddenException('Thiếu chữ ký webhook');
    }
    const expected =
      'sha256=' +
      createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException('Chữ ký webhook không hợp lệ');
    }
  }
}
