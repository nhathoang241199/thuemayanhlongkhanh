import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { publicListedLensForCameraWhere } from '../common/lens-listing';
import { sortLensesKitFirst } from '../common/lens-sort';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLensDto } from './dto/create-lens.dto';
import { UpdateLensDto } from './dto/update-lens.dto';

const lensWithCamerasInclude = {
  compatibleCameras: {
    select: {
      camera: { select: { id: true, name: true, brand: true } },
    },
  },
} as const;

function mapLensWithCameras<T extends { compatibleCameras: { camera: unknown }[] }>(
  row: T,
) {
  const { compatibleCameras, ...rest } = row;
  return {
    ...rest,
    cameras: compatibleCameras.map((c) => c.camera),
  };
}

@Injectable()
export class LensService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.lens.findMany({
      orderBy: { createdAt: 'desc' },
      include: lensWithCamerasInclude,
    });
    return rows.map(mapLensWithCameras);
  }

  async findPublic(cameraId: string) {
    const rows = await this.prisma.lens.findMany({
      where: publicListedLensForCameraWhere(cameraId),
      orderBy: [{ dayPrice: 'desc' }, { shiftPrice: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        quantity: true,
        dayPrice: true,
        shiftPrice: true,
        discountPercent: true,
        imageUrl: true,
      },
    });
    return sortLensesKitFirst(rows);
  }

  async findOne(id: string) {
    const lens = await this.prisma.lens.findUnique({
      where: { id },
      include: lensWithCamerasInclude,
    });
    if (!lens) {
      throw new NotFoundException(`Lens ${id} not found`);
    }
    return mapLensWithCameras(lens);
  }

  async create(dto: CreateLensDto) {
    const cameraIds = [...new Set(dto.cameraIds)];
    await this.validateCameraIds(cameraIds);
    const { cameraIds: _cameraIds, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      const lens = await tx.lens.create({
        data: {
          ...data,
          discountPercent: data.discountPercent ?? 0,
        },
      });
      await tx.cameraLens.createMany({
        data: cameraIds.map((cameraId) => ({ cameraId, lensId: lens.id })),
      });
      const full = await tx.lens.findUniqueOrThrow({
        where: { id: lens.id },
        include: lensWithCamerasInclude,
      });
      return mapLensWithCameras(full);
    });
  }

  async update(id: string, dto: UpdateLensDto) {
    const existing = await this.prisma.lens.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Lens ${id} not found`);
    }

    const { cameraIds, ...rest } = dto;
    if (cameraIds !== undefined) {
      const unique = [...new Set(cameraIds)];
      if (unique.length === 0) {
        throw new BadRequestException('Phải chọn ít nhất một máy ảnh tương thích');
      }
      await this.validateCameraIds(unique);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.lens.update({
          where: { id },
          data: rest,
        });
        if (cameraIds !== undefined) {
          const unique = [...new Set(cameraIds)];
          await tx.cameraLens.deleteMany({ where: { lensId: id } });
          await tx.cameraLens.createMany({
            data: unique.map((cameraId) => ({ cameraId, lensId: id })),
          });
        }
        const full = await tx.lens.findUniqueOrThrow({
          where: { id },
          include: lensWithCamerasInclude,
        });
        return mapLensWithCameras(full);
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`Lens ${id} not found`);
      }
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.lens.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException(`Lens ${id} not found`);
        }
        if (e.code === 'P2003' || e.code === 'P2014') {
          throw new ConflictException(
            'Không thể xóa lens đang có booking liên quan. Hãy xử lý booking trước.',
          );
        }
      }
      throw e;
    }
  }

  private async validateCameraIds(cameraIds: string[]): Promise<void> {
    const cameras = await this.prisma.camera.findMany({
      where: { id: { in: cameraIds } },
      select: { id: true, brand: true },
    });
    if (cameras.length !== cameraIds.length) {
      throw new BadRequestException('Một hoặc nhiều máy ảnh không tồn tại');
    }
    const brands = new Set(cameras.map((c) => c.brand));
    if (brands.size > 1) {
      throw new BadRequestException(
        'Các máy tương thích phải cùng một hãng',
      );
    }
  }
}
