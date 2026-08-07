import { Module } from '@nestjs/common';
import { ShopFeaturesController } from './shop-features.controller';
import { ShopFeaturesService } from './shop-features.service';

@Module({
  controllers: [ShopFeaturesController],
  providers: [ShopFeaturesService],
  exports: [ShopFeaturesService],
})
export class ShopFeaturesModule {}
