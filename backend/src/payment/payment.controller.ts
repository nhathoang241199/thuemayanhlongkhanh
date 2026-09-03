import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { SepayService, type SePayWebhookBody } from './sepay.service';

@Public()
@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly sepayService: SepayService) {}

  @Get('sepay/instructions')
  @ApiOperation({ summary: 'Thông tin chuyển khoản / QR SePay' })
  getInstructions(
    @Query('bookingId') bookingId: string,
    @Query('phone') phone: string,
  ) {
    return this.sepayService.getPaymentInstructions(bookingId, phone);
  }

  @Get('sepay/public-bank')
  @ApiOperation({ summary: 'Thông tin TK ngân hàng + QR (public)' })
  getPublicBank() {
    return this.sepayService.getPublicBankInfo();
  }

  @Post('sepay/webhook')
  @ApiOperation({ summary: 'SePay webhook (tiền vào TK)' })
  async sepayWebhook(
    @Body() body: SePayWebhookBody,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('api_key') apiKey?: string,
  ) {
    return this.sepayService.handleWebhook(body, headers, apiKey);
  }
}
