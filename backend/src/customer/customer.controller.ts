import {
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
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { IdentifyCustomerDto } from './dto/identify-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khách hàng' })
  @ApiOkResponse({ description: 'Mảng Customer' })
  findAll() {
    return this.customerService.findAll();
  }

  @Post('identify')
  @ApiOperation({
    summary: 'Nhận diện khách theo SĐT (tạo mới hoặc cập nhật tên)',
    description:
      'Public v1: tin SĐT từ client. Đã có SĐT → cập nhật tên; chưa có → tạo khách.',
  })
  @ApiOkResponse({ description: '{ customer, created }' })
  identify(@Body() dto: IdentifyCustomerDto) {
    return this.customerService.identify(dto);
  }

  @Get('verification')
  @ApiOperation({
    summary: 'Đã xác minh tài khoản (public, theo SĐT)',
    description: 'V1 tin client; chỉ trả về isVerified.',
  })
  @ApiOkResponse({ description: '{ isVerified: boolean }' })
  verification(@Query('phone') phone: string | undefined) {
    return this.customerService.getVerificationByPhone(phone);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết khách hàng' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo khách hàng' })
  @ApiCreatedResponse()
  @ApiConflictResponse({ description: 'Trùng số điện thoại' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customerService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật khách hàng' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Trùng số điện thoại' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customerService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa khách hàng' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Còn booking' })
  remove(@Param('id') id: string) {
    return this.customerService.remove(id);
  }
}
