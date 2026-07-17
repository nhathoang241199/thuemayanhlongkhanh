import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBookingTermsDto } from './dto/update-booking-terms.dto';

const SINGLETON_ID = 'singleton';

@Injectable()
export class BookingTermsService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrDefault() {
    const row = await this.prisma.bookingTerms.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (row) return row;
    return this.prisma.bookingTerms.create({
      data: { id: SINGLETON_ID, content: '' },
    });
  }

  async get() {
    const row = await this.findOrDefault();
    return {
      content: row.content,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getPublic() {
    const row = await this.findOrDefault();
    return { content: row.content };
  }

  async upsert(dto: UpdateBookingTermsDto) {
    const row = await this.prisma.bookingTerms.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, content: dto.content },
      update: { content: dto.content },
    });
    return {
      content: row.content,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
