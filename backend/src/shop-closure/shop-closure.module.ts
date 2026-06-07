import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopClosureController } from './shop-closure.controller';
import { ShopClosureService } from './shop-closure.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShopClosureController],
  providers: [ShopClosureService],
  exports: [ShopClosureService],
})
export class ShopClosureModule {}
