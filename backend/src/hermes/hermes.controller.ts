import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HermesApiAccess } from '../auth/hermes-api.decorator';
import { HermesPublishBlogDto } from './dto/hermes-blog.dto';
import {
  HermesLaunchPromotionDto,
  HermesPreviewPromotionPostDto,
  HermesPublishFanpageDto,
  HermesSetupPromotionDto,
} from './dto/hermes-promotion.dto';
import { HermesService } from './hermes.service';

@ApiTags('hermes')
@Controller('hermes')
export class HermesController {
  constructor(private readonly hermes: HermesService) {}

  @Get('promotion')
  @HermesApiAccess()
  @ApiOperation({ summary: 'Khuyến mãi hiện tại (Hermes agent)' })
  getPromotion() {
    return this.hermes.getCurrentPromotion();
  }

  @Post('promotion/preview-post')
  @HermesApiAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xem trước nội dung bài fanpage trước khi đăng',
  })
  previewPost(@Body() dto: HermesPreviewPromotionPostDto) {
    return this.hermes.previewPromotionPost(dto);
  }

  @Post('promotion/setup')
  @HermesApiAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Áp dụng % giảm + ngày lên web (máy, lens, ShopPromotion)',
  })
  setupPromotion(@Body() dto: HermesSetupPromotionDto) {
    return this.hermes.setupPromotion(dto);
  }

  @Post('facebook/publish')
  @HermesApiAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Đăng bài fanpage (published: true = Graph ngay; false = chờ admin)',
  })
  publishFanpage(@Body() dto: HermesPublishFanpageDto) {
    return this.hermes.submitFanpagePost(dto);
  }

  @Post('promotion/launch')
  @HermesApiAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Setup KM web + fanpage (published: true = đăng Graph ngay)',
  })
  launchPromotion(@Body() dto: HermesLaunchPromotionDto) {
    return this.hermes.launchPromotion(dto);
  }

  @Post('blog/publish')
  @HermesApiAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gửi bài blog (chờ duyệt hoặc xuất bản ngay với publish: true)',
  })
  publishBlog(@Body() dto: HermesPublishBlogDto) {
    return this.hermes.submitBlogPost(dto);
  }
}
