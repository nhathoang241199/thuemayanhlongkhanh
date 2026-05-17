import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CancelCustomerBookingDto } from './dto/cancel-customer-booking.dto';
import { RequestChangeCustomerBookingDto } from './dto/request-change-customer-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateCustomerBookingDto } from './dto/create-customer-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách booking' })
  @ApiOkResponse({ description: 'Kèm customer và camera (rút gọn)' })
  findAll() {
    return this.bookingService.findAll();
  }

  @Get('mine')
  @ApiOperation({
    summary: 'Đơn của khách theo SĐT',
    description:
      'Public v1: lọc theo query phone (chuẩn hóa chữ số). Không trả đơn đã kết thúc (COMPLETED, CANCELLED, REFUNDED).',
  })
  @ApiOkResponse({ description: 'Mảng booking của khách; rỗng nếu chưa có SĐT' })
  findMine(@Query('phone') phone: string | undefined) {
    if (!phone?.trim()) {
      throw new BadRequestException('phone is required');
    }
    return this.bookingService.findByCustomerPhone(phone);
  }

  @Post('customer')
  @ApiOperation({ summary: 'Khách tạo đơn (chờ thanh toán)' })
  @ApiCreatedResponse()
  createCustomer(@Body() dto: CreateCustomerBookingDto) {
    return this.bookingService.createCustomerBooking(dto);
  }

  @Post('customer/:id/cancel')
  @ApiOperation({ summary: 'Khách hủy đơn (chờ lấy máy) + TK hoàn 50%' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  cancelCustomer(
    @Param('id') id: string,
    @Body() dto: CancelCustomerBookingDto,
  ) {
    return this.bookingService.cancelCustomerBooking(id, dto);
  }

  @Post('customer/:id/request-change')
  @ApiOperation({ summary: 'Khách yêu cầu thay đổi đơn (chờ lấy máy)' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  requestChange(
    @Param('id') id: string,
    @Body() dto: RequestChangeCustomerBookingDto,
  ) {
    return this.bookingService.requestChangeCustomerBooking(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết booking' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo booking' })
  @ApiCreatedResponse()
  @ApiConflictResponse({ description: 'Trùng mã hoặc FK không hợp lệ' })
  create(@Body() dto: CreateBookingDto) {
    return this.bookingService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật booking' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa booking' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  remove(@Param('id') id: string) {
    return this.bookingService.remove(id);
  }
}
