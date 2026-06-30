import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopInfoController } from './shop-info.controller';
import { ShopInfoService } from './shop-info.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShopInfoController],
  providers: [ShopInfoService],
  exports: [ShopInfoService],
})
export class ShopInfoModule {}
