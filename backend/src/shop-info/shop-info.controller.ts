import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import {
  PublicShopInfoResponseDto,
  ShopInfoResponseDto,
} from './dto/shop-info-response.dto';
import { UpdateShopInfoDto } from './dto/update-shop-info.dto';
import { ShopInfoService } from './shop-info.service';

@ApiTags('shop-info')
@Controller('shop-info')
export class ShopInfoController {
  constructor(private readonly shopInfoService: ShopInfoService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Thông tin shop (public)' })
  @ApiOkResponse({ type: PublicShopInfoResponseDto })
  getPublic(): Promise<PublicShopInfoResponseDto> {
    return this.shopInfoService.getPublic();
  }

  @Get()
  @ApiOperation({ summary: 'Thông tin shop (admin)' })
  @ApiOkResponse({ type: ShopInfoResponseDto })
  get(): Promise<ShopInfoResponseDto> {
    return this.shopInfoService.get();
  }

  @Put()
  @ApiOperation({ summary: 'Cập nhật thông tin shop' })
  @ApiOkResponse({ type: ShopInfoResponseDto })
  upsert(@Body() dto: UpdateShopInfoDto): Promise<ShopInfoResponseDto> {
    return this.shopInfoService.upsert(dto);
  }
}
