import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CameraBrand } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { publicListedCameraWhere } from '../common/camera-listing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCameraDto } from './dto/create-camera.dto';
import { UpdateCameraDto } from './dto/update-camera.dto';

@Injectable()
export class CameraService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.camera.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublicBrands(): Promise<CameraBrand[]> {
    const rows = await this.prisma.camera.findMany({
      where: publicListedCameraWhere(),
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand);
  }

  findPublic(brand?: CameraBrand) {
    return this.prisma.camera.findMany({
      where: publicListedCameraWhere(brand),
      orderBy: [{ dayPrice: 'desc' }, { shiftPrice: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        brand: true,
        name: true,
        quantity: true,
        dayPrice: true,
        shiftPrice: true,
        discountPercent: true,
        imageUrl: true,
      },
    });
  }

  async findPublicOne(id: string) {
    const camera = await this.prisma.camera.findUnique({
      where: { id },
      select: {
        id: true,
        brand: true,
        name: true,
        quantity: true,
        dayPrice: true,
        shiftPrice: true,
        discountPercent: true,
        imageUrl: true,
        tutorialVideoUrl: true,
      },
    });
    if (!camera) {
      throw new NotFoundException(`Camera ${id} not found`);
    }
    return camera;
  }

  async findOne(id: string) {
    const camera = await this.prisma.camera.findUnique({ where: { id } });
    if (!camera) {
      throw new NotFoundException(`Camera ${id} not found`);
    }
    return camera;
  }

  create(dto: CreateCameraDto) {
    return this.prisma.camera.create({ data: dto });
  }

  async update(id: string, dto: UpdateCameraDto) {
    try {
      return await this.prisma.camera.update({
        where: { id },
        data: dto,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`Camera ${id} not found`);
      }
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.camera.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException(`Camera ${id} not found`);
        }
        if (e.code === 'P2003' || e.code === 'P2014') {
          throw new ConflictException(
            'Không thể xóa máy đang có booking liên quan. Hãy xử lý booking trước.',
          );
        }
      }
      throw e;
    }
  }
}
