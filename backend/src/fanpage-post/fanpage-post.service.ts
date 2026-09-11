import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacebookGraphService } from '../messenger/facebook-graph.service';
import { getMessengerConfig } from '../messenger/messenger.config';
import type {
  CreateFanpagePostDraftDto,
  FanpagePostStatus,
  RejectFanpagePostDraftDto,
  UpdateFanpagePostDraftDto,
} from './dto/fanpage-post.dto';

@Injectable()
export class FanpagePostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: FacebookGraphService,
  ) {}

  async createDraft(dto: CreateFanpagePostDraftDto) {
    const bookUrl = `${getMessengerConfig().frontendUrl.replace(/\/$/, '')}/book`;
    const row = await this.prisma.fanpagePostDraft.create({
      data: {
        message: dto.message.trim(),
        link: dto.link?.trim() || bookUrl,
        publishPublic: dto.publishPublic === true,
        source: dto.source?.trim() || 'hermes',
        promotionNote: dto.promotionNote?.trim() || null,
        status: 'pending',
      },
    });
    return this.toResponse(row);
  }

  /** Tạo draft rồi đăng Graph ngay (Hermes / automation). */
  async createAndPublish(dto: CreateFanpagePostDraftDto) {
    const draft = await this.createDraft({
      ...dto,
      publishPublic: dto.publishPublic !== false,
    });
    return this.approve(draft.id);
  }

  async list(status?: FanpagePostStatus) {
    const rows = await this.prisma.fanpagePostDraft.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => this.toResponse(row));
  }

  async update(id: string, dto: UpdateFanpagePostDraftDto) {
    const existing = await this.findPending(id);
    const row = await this.prisma.fanpagePostDraft.update({
      where: { id: existing.id },
      data: {
        ...(dto.message !== undefined ? { message: dto.message.trim() } : {}),
        ...(dto.link !== undefined ? { link: dto.link?.trim() || null } : {}),
        ...(dto.publishPublic !== undefined
          ? { publishPublic: dto.publishPublic }
          : {}),
      },
    });
    return this.toResponse(row);
  }

  async approve(id: string) {
    this.assertPublishEnabled();
    const draft = await this.findPending(id);
    const pageId = this.requirePageId();

    try {
      const result = await this.graph.publishPageFeedPost(
        pageId,
        draft.message,
        draft.link ?? undefined,
        draft.publishPublic,
      );
      const row = await this.prisma.fanpagePostDraft.update({
        where: { id: draft.id },
        data: {
          status: 'published',
          facebookPostId: result.id,
          publishedAt: new Date(),
        },
      });
      return {
        ...this.toResponse(row),
        postUrl: result.postUrl,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(
        `${msg}. Kiểm tra quyền pages_manage_posts trên Meta.`,
      );
    }
  }

  async reject(id: string, dto: RejectFanpagePostDraftDto) {
    const draft = await this.findPending(id);
    const row = await this.prisma.fanpagePostDraft.update({
      where: { id: draft.id },
      data: {
        status: 'rejected',
        rejectNote: dto.rejectNote?.trim() || null,
      },
    });
    return this.toResponse(row);
  }

  private async findPending(id: string) {
    const row = await this.prisma.fanpagePostDraft.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy bài đăng');
    if (row.status !== 'pending') {
      throw new BadRequestException('Bài này đã được xử lý rồi');
    }
    return row;
  }

  private assertPublishEnabled() {
    if (process.env.FACEBOOK_PUBLISH_ENABLED === 'false') {
      throw new ServiceUnavailableException(
        'Đăng fanpage tắt (FACEBOOK_PUBLISH_ENABLED=false)',
      );
    }
    if (!getMessengerConfig().pageAccessToken) {
      throw new ServiceUnavailableException('Thiếu FACEBOOK_PAGE_ACCESS_TOKEN');
    }
  }

  private requirePageId(): string {
    const pageId = getMessengerConfig().pageId;
    if (!pageId) {
      throw new BadRequestException('Thiếu FACEBOOK_PAGE_ID trong backend/.env');
    }
    return pageId;
  }

  private toResponse(row: {
    id: string;
    message: string;
    link: string | null;
    publishPublic: boolean;
    status: string;
    source: string;
    promotionNote: string | null;
    facebookPostId: string | null;
    rejectNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
  }) {
    return {
      id: row.id,
      message: row.message,
      link: row.link,
      publishPublic: row.publishPublic,
      status: row.status,
      source: row.source,
      promotionNote: row.promotionNote,
      facebookPostId: row.facebookPostId,
      rejectNote: row.rejectNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
    };
  }
}
