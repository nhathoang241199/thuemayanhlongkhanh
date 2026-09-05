import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import {
  ALLOWED_VERIFICATION_MIMES,
  MAX_BLOG_BANNER_BYTES,
  blogBannerUploadDiskPath,
  blogBannerUploadPublicUrl,
  verificationImageExtension,
} from '../common/upload-config';
import { PrismaService } from '../prisma/prisma.service';
import {
  excerptFromContent,
  slugifyTitle,
} from './blog-slug.util';
import type {
  BlogPostStatus,
  CreateBlogPostDto,
  RejectBlogPostDto,
  UpdateBlogPostDto,
} from './dto/blog-post.dto';

@Injectable()
export class BlogPostService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(dto: CreateBlogPostDto) {
    const slug = await this.resolveUniqueSlug(
      dto.slug?.trim() || slugifyTitle(dto.title),
    );
    const excerpt =
      dto.excerpt?.trim() || excerptFromContent(dto.content.trim());
    const row = await this.prisma.blogPost.create({
      data: {
        slug,
        title: dto.title.trim(),
        content: dto.content.trim(),
        excerpt,
        coverImageUrl: dto.coverImageUrl?.trim() || null,
        seoDescription:
          dto.seoDescription?.trim() || excerpt.slice(0, 300) || null,
        source: dto.source?.trim() || 'hermes',
        status: 'pending',
      },
    });
    return this.toResponse(row);
  }

  async createAndPublish(dto: CreateBlogPostDto) {
    const draft = await this.createDraft(dto);
    return this.publish(draft.id);
  }

  async list(status?: BlogPostStatus) {
    const rows = await this.prisma.blogPost.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => this.toResponse(row));
  }

  async listPublic(limit = 9, offset = 0) {
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = Math.max(offset, 0);
    const [rows, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where: { status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take,
        skip,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          publishedAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.blogPost.count({ where: { status: 'published' } }),
    ]);
    return {
      items: rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        coverImageUrl: row.coverImageUrl,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      limit: take,
      offset: skip,
    };
  }

  async getBySlugPublic(slug: string) {
    const row = await this.prisma.blogPost.findFirst({
      where: { slug, status: 'published' },
    });
    if (!row) throw new NotFoundException('Không tìm thấy bài viết');
    return this.toPublicDetail(row);
  }

  async listPublishedSlugs() {
    const rows = await this.prisma.blogPost.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
    return rows.map((row) => ({
      slug: row.slug,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    const existing = await this.findPending(id);
    let slug = existing.slug;
    if (dto.slug !== undefined && dto.slug.trim() !== existing.slug) {
      slug = await this.resolveUniqueSlug(dto.slug.trim(), existing.id);
    } else if (dto.title !== undefined && !dto.slug) {
      const next = slugifyTitle(dto.title.trim());
      if (next && next !== existing.slug) {
        slug = await this.resolveUniqueSlug(next, existing.id);
      }
    }

    const row = await this.prisma.blogPost.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
        slug,
        ...(dto.excerpt !== undefined
          ? { excerpt: dto.excerpt?.trim() || null }
          : {}),
        ...(dto.coverImageUrl !== undefined
          ? { coverImageUrl: dto.coverImageUrl?.trim() || null }
          : {}),
        ...(dto.seoDescription !== undefined
          ? { seoDescription: dto.seoDescription?.trim() || null }
          : {}),
      },
    });
    return this.toResponse(row);
  }

  async publish(id: string) {
    const draft = await this.findPending(id);
    if (!draft.coverImageUrl?.trim()) {
      throw new BadRequestException(
        'Bài blog cần có banner trước khi xuất bản.',
      );
    }
    const row = await this.prisma.blogPost.update({
      where: { id: draft.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });
    return this.toResponse(row);
  }

  async uploadBanner(id: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Thiếu file banner.');
    }
    if (file.size > MAX_BLOG_BANNER_BYTES) {
      throw new BadRequestException('Banner tối đa 3 MB.');
    }
    if (!ALLOWED_VERIFICATION_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
    }
    const ext = verificationImageExtension(file.mimetype);
    if (!ext) {
      throw new BadRequestException('Định dạng banner không hỗ trợ.');
    }

    const draft = await this.findPending(id);
    const filename = `${randomUUID()}${ext}`;
    const diskPath = blogBannerUploadDiskPath(draft.id, filename);
    await mkdir(dirname(diskPath), { recursive: true });
    await writeFile(diskPath, file.buffer);

    const coverImageUrl = blogBannerUploadPublicUrl(draft.id, filename);
    const row = await this.prisma.blogPost.update({
      where: { id: draft.id },
      data: { coverImageUrl },
    });
    return this.toResponse(row);
  }

  async reject(id: string, dto: RejectBlogPostDto) {
    const draft = await this.findPending(id);
    const row = await this.prisma.blogPost.update({
      where: { id: draft.id },
      data: {
        status: 'rejected',
        rejectNote: dto.rejectNote?.trim() || null,
      },
    });
    return this.toResponse(row);
  }

  private async findPending(id: string) {
    const row = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy bài viết');
    if (row.status !== 'pending') {
      throw new BadRequestException('Bài này đã được xử lý rồi');
    }
    return row;
  }

  private async resolveUniqueSlug(base: string, excludeId?: string) {
    const normalized = slugifyTitle(base) || 'bai-viet';
    let candidate = normalized;
    let n = 2;
    while (true) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug: candidate },
      });
      if (!existing || existing.id === excludeId) return candidate;
      candidate = `${normalized}-${n}`;
      n += 1;
      if (n > 100) {
        throw new ConflictException('Không tạo được slug duy nhất');
      }
    }
  }

  private toPublicDetail(row: {
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    coverImageUrl: string | null;
    seoDescription: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
  }) {
    return {
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      coverImageUrl: row.coverImageUrl,
      seoDescription: row.seoDescription,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toResponse(row: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    coverImageUrl: string | null;
    seoDescription: string | null;
    status: string;
    source: string;
    rejectNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
  }) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      coverImageUrl: row.coverImageUrl,
      seoDescription: row.seoDescription,
      status: row.status,
      source: row.source,
      rejectNote: row.rejectNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
    };
  }
}
