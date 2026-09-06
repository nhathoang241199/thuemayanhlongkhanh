import {
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { MAX_VERIFICATION_IMAGE_BYTES } from '../common/upload-config';
import { ShipperAccess, type ShipperJwtPayload } from '../auth/shipper-access.decorator';
import { ShipOrderService } from './ship-order.service';

@ApiTags('ship-orders')
@Controller('ship-orders')
export class ShipOrderController {
  constructor(private readonly shipOrderService: ShipOrderService) {}

  @ShipperAccess()
  @Get('pending')
  @ApiOperation({ summary: 'Đơn ship chờ nhận' })
  @ApiOkResponse()
  listPending() {
    return this.shipOrderService.listPending();
  }

  @ShipperAccess()
  @Get('mine')
  @ApiOperation({ summary: 'Đơn ship đã nhận của tôi' })
  @ApiOkResponse()
  listMine(@Req() req: Request & { shipper?: ShipperJwtPayload }) {
    return this.shipOrderService.listMine(req.shipper!.shipperId);
  }

  @ShipperAccess()
  @Get('waiting-return')
  @ApiOperation({ summary: 'Đơn đã giao — chờ khách trả máy' })
  @ApiOkResponse()
  listWaitingReturn(@Req() req: Request & { shipper?: ShipperJwtPayload }) {
    return this.shipOrderService.listWaitingReturn(req.shipper!.shipperId);
  }

  @ShipperAccess()
  @Post(':id/claim')
  @ApiOperation({ summary: 'Nhận đơn ship (atomic)' })
  @ApiOkResponse()
  claim(
    @Param('id') id: string,
    @Req() req: Request & { shipper?: ShipperJwtPayload },
  ) {
    return this.shipOrderService.claim(id, req.shipper!.shipperId);
  }

  @ShipperAccess()
  @Post(':id/unclaim')
  @ApiOperation({ summary: 'Trả lại đơn đã nhận' })
  @ApiOkResponse()
  unclaim(
    @Param('id') id: string,
    @Req() req: Request & { shipper?: ShipperJwtPayload },
  ) {
    return this.shipOrderService.unclaim(id, req.shipper!.shipperId);
  }

  @ShipperAccess()
  @Post(':id/complete')
  @ApiOperation({
    summary: 'Hoàn thành đơn giao (OUTBOUND) hoặc đơn trả (RETURN) đã nhận',
  })
  @ApiOkResponse()
  complete(
    @Param('id') id: string,
    @Req() req: Request & { shipper?: ShipperJwtPayload },
  ) {
    return this.shipOrderService.completeByShipper(
      id,
      req.shipper!.shipperId,
    );
  }

  @ShipperAccess()
  @Post(':id/reopen')
  @ApiOperation({
    summary: 'Hoàn tác hoàn thành giao trong ngày (bấm ▶ nhầm)',
  })
  @ApiOkResponse()
  reopen(
    @Param('id') id: string,
    @Req() req: Request & { shipper?: ShipperJwtPayload },
  ) {
    return this.shipOrderService.reopenByShipper(
      id,
      req.shipper!.shipperId,
    );
  }

  @ShipperAccess()
  @Post(':id/customer-verification-image')
  @ApiOperation({ summary: 'Chụp CCCD khách khi giao máy' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_VERIFICATION_IMAGE_BYTES },
    }),
  )
  uploadCustomerVerification(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_VERIFICATION_IMAGE_BYTES }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: Request & { shipper?: ShipperJwtPayload },
  ) {
    return this.shipOrderService.uploadCustomerVerification(
      id,
      req.shipper!.shipperId,
      file,
    );
  }
}
