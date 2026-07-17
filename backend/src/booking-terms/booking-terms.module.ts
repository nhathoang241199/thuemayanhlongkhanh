import { Module } from '@nestjs/common';
import { PolicyRagModule } from '../policy-rag/policy-rag.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingTermsController } from './booking-terms.controller';
import { BookingTermsService } from './booking-terms.service';

@Module({
  imports: [PrismaModule, PolicyRagModule],
  controllers: [BookingTermsController],
  providers: [BookingTermsService],
  exports: [BookingTermsService],
})
export class BookingTermsModule {}
