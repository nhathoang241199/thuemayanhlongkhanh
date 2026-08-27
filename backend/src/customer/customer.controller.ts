import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Public } from '../auth/public.decorator';
import { HermesApiAccess } from '../auth/hermes-api.decorator';
import { MAX_VERIFICATION_IMAGE_BYTES } from '../common/upload-config';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { IdentifyCustomerDto } from './dto/identify-customer.dto';
import { RemoveVerificationImageDto } from './dto/remove-verification-image.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @HermesApiAccess()
  @ApiOperation({ summary: 'Danh sách khách hàng' })
  @ApiOkResponse({
    description:
      'Không query: mảng Customer. Có ?page=&pageSize=: { items, total, page, pageSize }',
  })
  findAll(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('searchField') searchField?: string,
    @Query('search') search?: string,
  ) {
    const hasPage = pageStr !== undefined && pageStr !== '';
    const hasSize = pageSizeStr !== undefined && pageSizeStr !== '';
    if (hasPage || hasSize) {
      const page = Math.max(1, Number.parseInt(pageStr ?? '1', 10) || 1);
      const pageSize = Number.parseInt(pageSizeStr ?? '30', 10) || 30;
      const field =
        searchField === 'name' || searchField === 'phone'
          ? searchField
          : undefined;
      return this.customerService.findPage(page, pageSize, {
        searchField: field,
        search,
      });
    }
    return this.customerService.findAll();
  }

  @Public()
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

  @Public()
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
  @HermesApiAccess()
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

  @Post(':id/verification-images')
  @ApiOperation({ summary: 'Upload ảnh CCCD / xác minh (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ description: 'Customer đã cập nhật' })
  @ApiNotFoundResponse()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_VERIFICATION_IMAGE_BYTES },
    }),
  )
  uploadVerificationImage(
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
    return this.customerService.addVerificationImage(id, file);
  }

  @Delete(':id/verification-images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa ảnh CCCD / xác minh (admin)' })
  @ApiOkResponse({ description: 'Customer đã cập nhật' })
  @ApiNotFoundResponse()
  removeVerificationImage(
    @Param('id') id: string,
    @Body() dto: RemoveVerificationImageDto,
  ) {
    return this.customerService.removeVerificationImage(id, dto.url);
  }

  @Patch(':id')
  @HermesApiAccess()
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
