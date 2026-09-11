import {
  Injectable,
} from '@nestjs/common';
import { FanpagePostService } from '../fanpage-post/fanpage-post.service';
import { BlogPostService } from '../blog-post/blog-post.service';
import { getMessengerConfig } from '../messenger/messenger.config';
import { StatsService } from '../stats/stats.service';
import { buildPromotionFanpagePost } from './hermes-promotion-post';
import type {
  HermesLaunchPromotionDto,
  HermesPreviewPromotionPostDto,
  HermesPublishFanpageDto,
  HermesSetupPromotionDto,
} from './dto/hermes-promotion.dto';
import type { HermesPublishBlogDto } from './dto/hermes-blog.dto';

@Injectable()
export class HermesService {
  constructor(
    private readonly stats: StatsService,
    private readonly fanpagePosts: FanpagePostService,
    private readonly blogPosts: BlogPostService,
  ) {}

  async getCurrentPromotion() {
    return this.stats.getEquipmentDiscount();
  }

  previewPromotionPost(dto: HermesPreviewPromotionPostDto) {
    const bookUrl = `${getMessengerConfig().frontendUrl.replace(/\/$/, '')}/book`;
    const message = buildPromotionFanpagePost(
      {
        discountPercent: dto.discountPercent,
        startDate: dto.startDate,
        endDate: dto.endDate,
        targetCameraId: dto.targetCameraId ?? null,
      },
      bookUrl,
    );
    return {
      message,
      link: bookUrl,
      promotion: {
        discountPercent: dto.discountPercent,
        startDate: dto.startDate,
        endDate: dto.endDate,
        targetCameraId: dto.targetCameraId ?? null,
      },
    };
  }

  async setupPromotion(dto: HermesSetupPromotionDto) {
    return this.stats.applyEquipmentDiscount({
      discountPercent: dto.discountPercent,
      startDate: dto.startDate,
      endDate: dto.endDate,
      targetCameraId: dto.targetCameraId,
    });
  }

  /** Agent gửi bài → chờ admin duyệt, không đăng thẳng. */
  async submitFanpagePost(dto: HermesPublishFanpageDto) {
    const bookUrl = `${getMessengerConfig().frontendUrl.replace(/\/$/, '')}/book`;
    const draft = await this.fanpagePosts.createDraft({
      message: dto.message.trim(),
      link: dto.link?.trim() || bookUrl,
      publishPublic: dto.published === true,
      source: 'hermes',
    });
    return {
      draft,
      note: 'Bài đã gửi chờ duyệt trên admin → Bài fanpage.',
    };
  }

  async launchPromotion(dto: HermesLaunchPromotionDto) {
    const bookUrl = `${getMessengerConfig().frontendUrl.replace(/\/$/, '')}/book`;
    const preview = buildPromotionFanpagePost(
      {
        discountPercent: dto.discountPercent,
        startDate: dto.startDate,
        endDate: dto.endDate,
        targetCameraId: dto.targetCameraId ?? null,
      },
      bookUrl,
      dto.message,
    );

    const promotion = await this.setupPromotion(dto);

    const shouldSubmitPost = dto.publishToFanpage !== false;
    if (!shouldSubmitPost) {
      return {
        promotion,
        draft: null,
        previewMessage: preview,
      };
    }

    const promotionNote = JSON.stringify({
      discountPercent: dto.discountPercent,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const draft = await this.fanpagePosts.createDraft({
      message: preview,
      link: bookUrl,
      publishPublic: dto.published === true,
      source: 'hermes',
      promotionNote,
    });

    return {
      promotion,
      draft,
      previewMessage: preview,
      note: 'KM đã áp dụng web; bài fanpage chờ admin duyệt.',
    };
  }

  /** Hermes gửi bài blog — mặc định chờ duyệt; publish=true thì lên /posts ngay. */
  async submitBlogPost(dto: HermesPublishBlogDto) {
    const payload = {
      title: dto.title.trim(),
      content: dto.content.trim(),
      slug: dto.slug?.trim(),
      excerpt: dto.excerpt?.trim(),
      seoDescription: dto.seoDescription?.trim(),
      coverImageUrl: dto.coverImageUrl?.trim() || dto.bannerUrl?.trim(),
      source: 'hermes',
    };

    if (dto.publish === true) {
      const post = await this.blogPosts.createAndPublish(payload);
      const frontendUrl = getMessengerConfig().frontendUrl.replace(/\/$/, '');
      return {
        post,
        url: `${frontendUrl}/posts/${post.slug}`,
        note: 'Bài blog đã xuất bản trên /posts.',
      };
    }

    const post = await this.blogPosts.createDraft(payload);
    return {
      post,
      note: 'Bài blog chờ duyệt tại admin → Blog.',
    };
  }
}
