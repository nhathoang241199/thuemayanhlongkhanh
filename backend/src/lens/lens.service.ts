import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CameraBrand } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { publicListedLensWhere } from '../common/lens-listing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLensDto } from './dto/create-lens.dto';
import { UpdateLensDto } from './dto/update-lens.dto';

@Injectable()
export class LensService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.lens.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findPublic(brand?: CameraBrand) {
    return this.prisma.lens.findMany({
      where: publicListedLensWhere(brand),
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

  async findOne(id: string) {
    const lens = await this.prisma.lens.findUnique({ where: { id } });
    if (!lens) {
      throw new NotFoundException(`Lens ${id} not found`);
    }
    return lens;
  }

  create(dto: CreateLensDto) {
    return this.prisma.lens.create({ data: dto });
  }

  async update(id: string, dto: UpdateLensDto) {
    try {
      return await this.prisma.lens.update({
        where: { id },
        data: dto,
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
}
