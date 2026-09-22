import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopInfoDto } from './dto/update-shop-info.dto';
import {
  parseMapsLatLng,
  resolveMapsEmbedSrc,
  resolveMapsRedirectUrl,
  isMapsShortLink,
} from './google-maps-embed';

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
    latitude: number | null;
    longitude: number | null;
  }) {
    return {
      phone: trimField(row.phone),
      address: trimField(row.address),
      mapUrl: trimField(row.mapUrl),
      latitude: row.latitude,
      longitude: row.longitude,
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
    let row = await this.findOrDefault();
    row = await this.maybeHydrateCoordsFromMapUrl(row);
    const mapEmbedUrl = await resolveMapsEmbedSrc({
      address: row.address,
      mapUrl: row.mapUrl,
      latitude: row.latitude,
      longitude: row.longitude,
    });
    return {
      ...this.toPublic(row),
      mapEmbedUrl,
    };
  }

  /**
   * If admin only saved a short Maps link, resolve once and persist lat/lng
   * so the home page can always embed the map.
   */
  private async maybeHydrateCoordsFromMapUrl(row: {
    id: string;
    phone: string;
    address: string;
    mapUrl: string;
    latitude: number | null;
    longitude: number | null;
    updatedAt: Date;
  }) {
    if (row.latitude != null && row.longitude != null) return row;
    const mapUrl = trimField(row.mapUrl);
    if (!mapUrl) return row;

    let resolved = mapUrl;
    if (isMapsShortLink(mapUrl)) {
      const next = await resolveMapsRedirectUrl(mapUrl);
      if (next) resolved = next;
    }
    const coords = parseMapsLatLng(resolved);
    if (!coords) return row;

    return this.prisma.shopInfo.update({
      where: { id: row.id },
      data: {
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    });
  }

  async upsert(dto: UpdateShopInfoDto) {
    const mapUrl = trimField(dto.mapUrl);
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (mapUrl) {
      let resolved = mapUrl;
      if (isMapsShortLink(mapUrl)) {
        const next = await resolveMapsRedirectUrl(mapUrl);
        if (next) resolved = next;
      }
      const coords = parseMapsLatLng(resolved);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    const row = await this.prisma.shopInfo.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        phone: trimField(dto.phone),
        address: trimField(dto.address),
        mapUrl,
        latitude,
        longitude,
      },
      update: {
        phone: trimField(dto.phone),
        address: trimField(dto.address),
        mapUrl,
        latitude,
        longitude,
      },
    });
    return {
      ...this.toPublic(row),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
