import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { normalizePhone } from '../common/normalize-phone';
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
