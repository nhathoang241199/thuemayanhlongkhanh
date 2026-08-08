import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import {
  PublicShopFeaturesResponseDto,
  ShopFeaturesResponseDto,
} from './dto/shop-features-response.dto';
import { UpdateShopFeaturesDto } from './dto/update-shop-features.dto';
import { ShopFeaturesService } from './shop-features.service';

@ApiTags('shop-features')
@Controller('shop-features')
export class ShopFeaturesController {
  constructor(private readonly shopFeaturesService: ShopFeaturesService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Cấu hình chức năng shop (public)' })
  @ApiOkResponse({ type: PublicShopFeaturesResponseDto })
  getPublic(): Promise<PublicShopFeaturesResponseDto> {
    return this.shopFeaturesService.getPublic();
  }

  @Get()
  @ApiOperation({ summary: 'Cấu hình chức năng admin (admin)' })
  @ApiOkResponse({ type: ShopFeaturesResponseDto })
  get(): Promise<ShopFeaturesResponseDto> {
    return this.shopFeaturesService.get();
  }

  @Put()
  @ApiOperation({ summary: 'Cập nhật cấu hình chức năng admin' })
  @ApiOkResponse({ type: ShopFeaturesResponseDto })
  upsert(@Body() dto: UpdateShopFeaturesDto): Promise<ShopFeaturesResponseDto> {
    return this.shopFeaturesService.upsert(dto);
  }
}
