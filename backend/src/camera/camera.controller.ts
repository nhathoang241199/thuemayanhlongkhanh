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
import { CameraBrand } from '../../generated/prisma/enums';
import { CameraService } from './camera.service';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';

@ApiTags('cameras')
@Controller('cameras')
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách máy ảnh' })
  @ApiOkResponse({ description: 'Mảng Camera' })
  findAll() {
    return this.cameraService.findAll();
  }

  @Get('public')
  @ApiOperation({ summary: 'Danh sách máy (khách)' })
  @ApiOkResponse({ description: 'Máy theo hãng, field public' })
  findPublic(@Query('brand') brand?: CameraBrand) {
    return this.cameraService.findPublic(brand);
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Chi tiết máy (khách)' })
  @ApiOkResponse({ description: 'Máy public kèm video hướng dẫn' })
  @ApiNotFoundResponse()
  findPublicOne(@Param('id') id: string) {
    return this.cameraService.findPublicOne(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một máy' })
  @ApiOkResponse({ description: 'Camera' })
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.cameraService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo máy mới' })
  @ApiCreatedResponse({ description: 'Camera đã tạo' })
  create(@Body() dto: CreateCameraDto) {
    return this.cameraService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật máy' })
  @ApiOkResponse({ description: 'Camera sau cập nhật' })
  @ApiNotFoundResponse()
  update(@Param('id') id: string, @Body() dto: UpdateCameraDto) {
    return this.cameraService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa máy' })
  @ApiOkResponse({ description: 'Bản ghi đã xóa' })
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description: 'Còn booking tham chiếu tới máy này',
  })
  remove(@Param('id') id: string) {
    return this.cameraService.remove(id);
  }
}
