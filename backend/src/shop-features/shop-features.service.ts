import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopFeaturesDto } from './dto/update-shop-features.dto';

const SINGLETON_ID = 'singleton';

@Injectable()
export class ShopFeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrDefault() {
    const row = await this.prisma.shopFeatures.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (row) return row;
    return this.prisma.shopFeatures.create({
      data: { id: SINGLETON_ID },
    });
  }

  async get() {
    const row = await this.findOrDefault();
    return {
      printEnabled: row.printEnabled,
      depositEnabled: row.depositEnabled,
      shipEnabled: row.shipEnabled,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getPublic() {
    const row = await this.findOrDefault();
    return {
      depositEnabled: row.depositEnabled,
      shipEnabled: row.shipEnabled,
    };
  }

  async upsert(dto: UpdateShopFeaturesDto) {
    const row = await this.prisma.shopFeatures.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        printEnabled: dto.printEnabled,
        depositEnabled: dto.depositEnabled,
        shipEnabled: dto.shipEnabled,
      },
      update: {
        printEnabled: dto.printEnabled,
        depositEnabled: dto.depositEnabled,
        shipEnabled: dto.shipEnabled,
      },
    });
    return {
      printEnabled: row.printEnabled,
      depositEnabled: row.depositEnabled,
      shipEnabled: row.shipEnabled,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
