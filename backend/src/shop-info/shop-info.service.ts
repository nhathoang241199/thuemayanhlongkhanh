import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopInfoDto } from './dto/update-shop-info.dto';

const SINGLETON_ID = 'singleton';

function trimField(value: string): string {
  return value.trim();
}

@Injectable()
export class ShopInfoService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrDefault() {
    const row = await this.prisma.shopInfo.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (row) return row;
    return this.prisma.shopInfo.create({
      data: { id: SINGLETON_ID },
    });
  }

  private toPublic(row: {
    phone: string;
    address: string;
    mapUrl: string;
  }) {
    return {
      phone: trimField(row.phone),
      address: trimField(row.address),
      mapUrl: trimField(row.mapUrl),
    };
  }

  async get() {
    const row = await this.findOrDefault();
    return {
      ...this.toPublic(row),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getPublic() {
    const row = await this.findOrDefault();
    return this.toPublic(row);
  }

  async upsert(dto: UpdateShopInfoDto) {
    const row = await this.prisma.shopInfo.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        phone: trimField(dto.phone),
        address: trimField(dto.address),
        mapUrl: trimField(dto.mapUrl),
      },
      update: {
        phone: trimField(dto.phone),
        address: trimField(dto.address),
        mapUrl: trimField(dto.mapUrl),
      },
    });
    return {
      ...this.toPublic(row),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
