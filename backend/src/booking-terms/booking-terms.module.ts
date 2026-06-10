import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingTermsController } from './booking-terms.controller';
import { BookingTermsService } from './booking-terms.service';

@Module({
  imports: [PrismaModule],
  controllers: [BookingTermsController],
  providers: [BookingTermsService],
  exports: [BookingTermsService],
})
export class BookingTermsModule {}
