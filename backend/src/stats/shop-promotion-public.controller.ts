import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { PublicPromotionResponseDto } from './dto/equipment-discount-response.dto';
import { StatsService } from './stats.service';

@ApiTags('public')
@Public()
@Controller('public')
export class ShopPromotionPublicController {
  constructor(private readonly statsService: StatsService) {}

  @Get('promotion')
  @ApiOperation({
    summary: 'Khuyến mãi giảm giá chung (public)',
    description:
      'Trả về % giảm và khoảng ngày khuyến mãi toàn shop.',
  })
  @ApiOkResponse({ type: PublicPromotionResponseDto })
  getPromotion(): Promise<PublicPromotionResponseDto> {
    return this.statsService.getPublicPromotion();
  }
}
