import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { Prisma } from '../../generated/prisma/client';
import { normalizePhone } from '../common/normalize-phone';
import {
  ALLOWED_VERIFICATION_MIMES,
  MAX_VERIFICATION_IMAGE_BYTES,
  MAX_VERIFICATION_IMAGES,
  parseVerificationUploadPath,
  verificationImageExtension,
  verificationUploadDiskPath,
  verificationUploadPublicUrl,
} from '../common/upload-config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { IdentifyCustomerDto } from './dto/identify-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPage(page: number, pageSize: number) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    const skip = (safePage - 1) * safeSize;
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeSize,
      }),
      this.prisma.customer.count(),
    ]);
    return {
      items,
      total,
      page: safePage,
      pageSize: safeSize,
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.customer.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return row;
  }

  /**
   * Public v1: tra cứu đã xác minh theo SĐT (dùng cho flow đặt lịch).
   */
  async getVerificationByPhone(phoneRaw: string | undefined) {
    if (!phoneRaw?.trim()) {
      throw new BadRequestException('phone is required');
    }
    const phone = normalizePhone(phoneRaw);
    if (phone.length < 9) {
      throw new BadRequestException('Số điện thoại không hợp lệ.');
    }
    const customer = await this.prisma.customer.findUnique({
      where: { phone },
      select: { isVerified: true },
    });
    return { isVerified: customer?.isVerified ?? false };
  }

  /**
   * Nhận diện khách theo SĐT (public v1 — tin client).
   * Đã có SĐT: cập nhật tên; chưa có: tạo mới.
   */
  async identify(dto: IdentifyCustomerDto) {
    const phone = normalizePhone(dto.phone);
    if (phone.length < 9) {
      throw new BadRequestException('Số điện thoại không hợp lệ.');
    }
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Tên không được để trống.');
    }

    const existing = await this.prisma.customer.findUnique({
      where: { phone },
    });

    if (existing) {
      const customer = await this.prisma.customer.update({
        where: { id: existing.id },
        data: { name },
      });
      return { customer, created: false as const };
    }

    try {
      const customer = await this.prisma.customer.create({
        data: { name, phone },
      });
      return { customer, created: true as const };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Số điện thoại đã được đăng ký.');
      }
      throw e;
    }
  }

  async create(dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({
        data: {
          name: dto.name,
          phone: normalizePhone(dto.phone),
          facebookUrl: dto.facebookUrl,
          verificationImageUrls: dto.verificationImageUrls ?? [],
          isVerified: dto.isVerified ?? false,
          customerTag: dto.customerTag ?? 'NORMAL',
          note: dto.note,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Số điện thoại đã được đăng ký.');
      }
      throw e;
    }
  }

  async addVerificationImage(id: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Thiếu file ảnh.');
    }
    if (file.size > MAX_VERIFICATION_IMAGE_BYTES) {
      throw new BadRequestException('Ảnh tối đa 5 MB.');
    }
    if (!ALLOWED_VERIFICATION_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
    }
    const ext = verificationImageExtension(file.mimetype);
    if (!ext) {
      throw new BadRequestException('Định dạng ảnh không hỗ trợ.');
    }

    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    if (customer.verificationImageUrls.length >= MAX_VERIFICATION_IMAGES) {
      throw new BadRequestException(
        `Tối đa ${MAX_VERIFICATION_IMAGES} ảnh xác minh mỗi khách.`,
      );
    }

    const filename = `${randomUUID()}${ext}`;
    const diskPath = verificationUploadDiskPath(id, filename);
    await mkdir(dirname(diskPath), { recursive: true });
    await writeFile(diskPath, file.buffer);

    const publicUrl = verificationUploadPublicUrl(id, filename);
    return this.prisma.customer.update({
      where: { id },
      data: {
        verificationImageUrls: {
          push: publicUrl,
        },
      },
    });
  }

  async removeVerificationImage(id: string, url: string) {
    const trimmed = url?.trim();
    if (!trimmed) {
      throw new BadRequestException('url is required');
    }

    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    if (!customer.verificationImageUrls.includes(trimmed)) {
      throw new BadRequestException('Ảnh không thuộc khách hàng này.');
    }

    const parsed = parseVerificationUploadPath(trimmed);
    if (parsed && parsed.customerId === id) {
      const diskPath = verificationUploadDiskPath(
        parsed.customerId,
        parsed.filename,
      );
      await unlink(diskPath).catch(() => undefined);
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        verificationImageUrls: customer.verificationImageUrls.filter(
          (u) => u !== trimmed,
        ),
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    try {
      return await this.prisma.customer.update({
        where: { id },
        data: {
          ...dto,
          verificationImageUrls:
            dto.verificationImageUrls === undefined
              ? undefined
              : dto.verificationImageUrls,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException(`Customer ${id} not found`);
        }
        if (e.code === 'P2002') {
          throw new ConflictException('Số điện thoại đã được đăng ký.');
        }
      }
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.customer.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException(`Customer ${id} not found`);
        }
        if (e.code === 'P2003' || e.code === 'P2014') {
          throw new ConflictException(
            'Không thể xóa khách đang có booking. Hãy xử lý booking trước.',
          );
        }
      }
      throw e;
    }
  }
}
