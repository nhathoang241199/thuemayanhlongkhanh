import { Injectable, Logger } from '@nestjs/common';
import { PolicyRagIndexService } from '../policy-rag/policy-rag-index.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBookingTermsDto } from './dto/update-booking-terms.dto';

const SINGLETON_ID = 'singleton';

@Injectable()
export class BookingTermsService {
  private readonly logger = new Logger(BookingTermsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyRagIndex: PolicyRagIndexService,
  ) {}

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

    void this.policyRagIndex.reindexBookingTerms(row.content).catch((err) => {
      this.logger.error(
        'Policy RAG re-index thất bại sau khi lưu điều khoản',
        err instanceof Error ? err.stack : err,
      );
    });

    return {
      content: row.content,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
