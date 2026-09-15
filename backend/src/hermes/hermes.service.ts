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
  HermesPublishFanpagePhotoDto,
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
      },
    };
  }

  async setupPromotion(dto: HermesSetupPromotionDto) {
    return this.stats.applyEquipmentDiscount({
      discountPercent: dto.discountPercent,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
  }

  /** Agent gửi bài fanpage — published=true thì đăng Graph ngay. */
  async submitFanpagePost(dto: HermesPublishFanpageDto) {
    const bookUrl = `${getMessengerConfig().frontendUrl.replace(/\/$/, '')}/book`;
    const payload = {
      message: dto.message.trim(),
      link: dto.link?.trim() || bookUrl,
      publishPublic: true,
      source: 'hermes' as const,
    };

    if (dto.published === true) {
      const published = await this.fanpagePosts.createAndPublish(payload);
      return {
        draft: published,
        postUrl: published.postUrl,
        note: 'Bài fanpage đã đăng công khai.',
      };
    }

    const draft = await this.fanpagePosts.createDraft({
      ...payload,
      publishPublic: true,
    });
    return {
      draft,
      note: 'Bài đã gửi chờ duyệt trên admin → Bài fanpage.',
    };
  }

  async submitFanpagePhoto(dto: HermesPublishFanpagePhotoDto) {
    const bookUrl = `${getMessengerConfig().frontendUrl.replace(/\/$/, '')}/book`;
    if (dto.published !== true) {
      throw new Error('Đăng ảnh fanpage phải có published: true');
    }
    const published = await this.fanpagePosts.createAndPublishPhoto(
      {
        message: dto.message.trim(),
        link: dto.link?.trim() || bookUrl,
        publishPublic: true,
        source: 'hermes',
      },
      dto.imageUrl.trim(),
    );
    return {
      draft: published,
      postUrl: published.postUrl,
      note: 'Bài ảnh fanpage đã đăng công khai.',
    };
  }

  async launchPromotion(dto: HermesLaunchPromotionDto) {
    const bookUrl = `${getMessengerConfig().frontendUrl.replace(/\/$/, '')}/book`;
    const preview = buildPromotionFanpagePost(
      {
        discountPercent: dto.discountPercent,
        startDate: dto.startDate,
        endDate: dto.endDate,
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

    const payload = {
      message: preview,
      link: bookUrl,
      publishPublic: true,
      source: 'hermes' as const,
      promotionNote,
    };

    if (dto.published === true) {
      const published = await this.fanpagePosts.createAndPublish(payload);
      return {
        promotion,
        draft: published,
        previewMessage: preview,
        postUrl: published.postUrl,
        note: 'KM đã áp dụng web; bài fanpage đã đăng công khai.',
      };
    }

    const draft = await this.fanpagePosts.createDraft(payload);

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
