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
import { Public } from '../auth/public.decorator';
import { CameraBrand } from '../../generated/prisma/enums';
import { LensService } from './lens.service';
import { CreateLensDto } from './dto/create-lens.dto';
import { UpdateLensDto } from './dto/update-lens.dto';

@ApiTags('lenses')
@Controller('lenses')
export class LensController {
  constructor(private readonly lensService: LensService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách lens (admin)' })
  @ApiOkResponse({ description: 'Mảng Lens' })
  findAll() {
    return this.lensService.findAll();
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Danh sách lens (khách)' })
  @ApiOkResponse({ description: 'Lens theo hãng' })
  findPublic(@Query('brand') brand?: CameraBrand) {
    return this.lensService.findPublic(brand);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết lens (admin)' })
  @ApiOkResponse({ description: 'Lens' })
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.lensService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo lens mới' })
  @ApiCreatedResponse({ description: 'Lens đã tạo' })
  create(@Body() dto: CreateLensDto) {
    return this.lensService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật lens' })
  @ApiOkResponse({ description: 'Lens sau cập nhật' })
  @ApiNotFoundResponse()
  update(@Param('id') id: string, @Body() dto: UpdateLensDto) {
    return this.lensService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa lens' })
  @ApiOkResponse({ description: 'Bản ghi đã xóa' })
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description: 'Còn booking tham chiếu tới lens này',
  })
  remove(@Param('id') id: string) {
    return this.lensService.remove(id);
  }
}
