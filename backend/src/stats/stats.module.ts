import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopPromotionPublicController } from './shop-promotion-public.controller';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [PrismaModule],
  controllers: [StatsController, ShopPromotionPublicController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
