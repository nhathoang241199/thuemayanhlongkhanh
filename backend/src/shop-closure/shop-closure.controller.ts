import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateShopClosureDto } from './dto/create-shop-closure.dto';
import { ShopClosureService } from './shop-closure.service';

function parseOptionalYearMonth(
  yearRaw?: string,
  monthRaw?: string,
): { year?: number; month?: number } {
  if (yearRaw === undefined && monthRaw === undefined) {
    return {};
  }
  if (yearRaw === undefined || monthRaw === undefined) {
    throw new BadRequestException(
      'year and month must both be provided to filter by period',
    );
  }
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  if (year < 2000 || year > 2100) {
    throw new BadRequestException('year must be between 2000 and 2100');
  }
  if (month < 1 || month > 12) {
    throw new BadRequestException('month must be between 1 and 12');
  }
  return { year, month };
}

@ApiTags('shop-closures')
@Controller('shop-closures')
export class ShopClosureController {
  constructor(private readonly shopClosureService: ShopClosureService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách ngày nghỉ shop' })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Lọc theo tháng; cần kèm month',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    description: 'Tháng 1–12; cần kèm year',
  })
  @ApiOkResponse()
  findAll(
    @Query('year') yearRaw?: string,
    @Query('month') monthRaw?: string,
  ) {
    const { year, month } = parseOptionalYearMonth(yearRaw, monthRaw);
    if (year !== undefined && month !== undefined) {
      return this.shopClosureService.findAll({ year, month });
    }
    return this.shopClosureService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết ngày nghỉ' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.shopClosureService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm khoảng ngày nghỉ' })
  @ApiCreatedResponse()
  create(@Body() dto: CreateShopClosureDto) {
    return this.shopClosureService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa khoảng ngày nghỉ' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  remove(@Param('id') id: string) {
    return this.shopClosureService.remove(id);
  }
}
