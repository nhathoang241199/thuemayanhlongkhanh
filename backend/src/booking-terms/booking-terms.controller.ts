import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { BookingTermsService } from './booking-terms.service';
import { BookingTermsResponseDto } from './dto/booking-terms-response.dto';
import { UpdateBookingTermsDto } from './dto/update-booking-terms.dto';

@ApiTags('booking-terms')
@Controller('booking-terms')
export class BookingTermsController {
  constructor(private readonly bookingTermsService: BookingTermsService) {}

  @Public()
  @Get('public')
  @ApiOperation({
    summary: 'Điều khoản đặt lịch (public)',
    description: 'Nội dung hiển thị cho khách ở bước xác nhận.',
  })
  @ApiOkResponse({ type: BookingTermsResponseDto })
  getPublic(): Promise<BookingTermsResponseDto> {
    return this.bookingTermsService.getPublic();
  }

  @Get()
  @ApiOperation({ summary: 'Điều khoản đặt lịch (admin)' })
  @ApiOkResponse({ type: BookingTermsResponseDto })
  get(): Promise<BookingTermsResponseDto> {
    return this.bookingTermsService.get();
  }

  @Put()
  @ApiOperation({ summary: 'Cập nhật điều khoản đặt lịch' })
  @ApiOkResponse({ type: BookingTermsResponseDto })
  upsert(
    @Body() dto: UpdateBookingTermsDto,
  ): Promise<BookingTermsResponseDto> {
    return this.bookingTermsService.upsert(dto);
  }
}
