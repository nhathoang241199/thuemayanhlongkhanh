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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common/pipes';
import { Public } from '../auth/public.decorator';
import { HermesApiAccess } from '../auth/hermes-api.decorator';
import { BookingService } from './booking.service';
import { CancelCustomerBookingDto } from './dto/cancel-customer-booking.dto';
import { RequestChangeCustomerBookingDto } from './dto/request-change-customer-booking.dto';
import { UpdatePendingCustomerBookingDto } from './dto/update-pending-customer-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateCustomerBookingDto } from './dto/create-customer-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { SaveBookingContractDto } from './dto/save-booking-contract.dto';
import { MAX_VERIFICATION_IMAGE_BYTES } from '../common/upload-config';

@ApiTags('bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @HermesApiAccess()
  @ApiOperation({ summary: 'Danh sách booking' })
  @ApiOkResponse({ description: 'Kèm customer và camera (rút gọn)' })
  findAll() {
    return this.bookingService.findAll();
  }

  @Public()
  @Get('mine')
  @ApiOperation({
    summary: 'Đơn của khách theo SĐT',
    description:
      'Public v1: lọc theo query phone (chuẩn hóa chữ số). Không trả đơn đã kết thúc (COMPLETED, CANCELLED).',
  })
  @ApiOkResponse({ description: 'Mảng booking của khách; rỗng nếu chưa có SĐT' })
  findMine(@Query('phone') phone: string | undefined) {
    if (!phone?.trim()) {
      throw new BadRequestException('phone is required');
    }
    return this.bookingService.findByCustomerPhone(phone);
  }

  @Public()
  @Post('customer')
  @ApiOperation({ summary: 'Khách tạo đơn (chờ cọc)' })
  @ApiCreatedResponse()
  createCustomer(@Body() dto: CreateCustomerBookingDto) {
    return this.bookingService.createCustomerBooking(dto);
  }

  @Public()
  @Post('customer/:id/cancel')
  @ApiOperation({
    summary: 'Khách hủy đơn (chờ cọc hoặc chờ lấy máy) + TK hoàn cọc',
  })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  cancelCustomer(
    @Param('id') id: string,
    @Body() dto: CancelCustomerBookingDto,
  ) {
    return this.bookingService.cancelCustomerBooking(id, dto);
  }

  @Public()
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

  @Public()
  @Post('customer/:id/update-pending')
  @ApiOperation({ summary: 'Khách sửa đơn chờ cọc (trước khi thanh toán)' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  updatePending(
    @Param('id') id: string,
    @Body() dto: UpdatePendingCustomerBookingDto,
  ) {
    return this.bookingService.updatePendingCustomerBooking(id, dto);
  }

  @Get(':id')
  @HermesApiAccess()
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

  @Patch(':id/contract')
  @ApiOperation({ summary: 'Lưu thông tin hợp đồng in (CCCD, phương thức cọc)' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  saveContract(@Param('id') id: string, @Body() dto: SaveBookingContractDto) {
    return this.bookingService.saveContract(id, dto);
  }

  @Post(':id/collateral-image')
  @ApiOperation({ summary: 'Upload ảnh vật thế chân (strict mode)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_VERIFICATION_IMAGE_BYTES },
    }),
  )
  uploadCollateralImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_VERIFICATION_IMAGE_BYTES }),
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/png|image\/webp)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.bookingService.addCollateralImage(id, file);
  }

  @Patch(':id')
  @HermesApiAccess()
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
