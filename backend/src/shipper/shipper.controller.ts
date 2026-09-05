import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { MAX_PAYOUT_QR_BYTES } from '../common/upload-config';
import { CreateShipperDto, UpdateShipperDto } from './dto/shipper.dto';
import { ShipperService } from './shipper.service';

@ApiTags('shippers')
@Controller('shippers')
export class ShipperController {
  constructor(private readonly shipperService: ShipperService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách shipper (admin)' })
  @ApiOkResponse()
  findAll() {
    return this.shipperService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo shipper (admin)' })
  create(@Body() dto: CreateShipperDto) {
    return this.shipperService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật shipper (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateShipperDto) {
    return this.shipperService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá shipper (admin)' })
  remove(@Param('id') id: string) {
    return this.shipperService.remove(id);
  }

  @Post(':id/confirm-payout')
  @ApiOperation({ summary: 'Xác nhận đã chuyển khoản — trừ hết số dư (admin)' })
  confirmPayout(@Param('id') id: string) {
    return this.shipperService.confirmPayout(id);
  }

  @Post(':id/payout-qr')
  @ApiOperation({ summary: 'Upload QR nhận tiền của shipper (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PAYOUT_QR_BYTES },
    }),
  )
  uploadPayoutQr(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PAYOUT_QR_BYTES }),
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/png|image\/webp)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.shipperService.uploadPayoutQr(id, file);
  }
}
