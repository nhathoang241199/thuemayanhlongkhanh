import { Module } from '@nestjs/common';
import { LensController } from './lens.controller';
import { LensService } from './lens.service';

@Module({
  controllers: [LensController],
  providers: [LensService],
  exports: [LensService],
})
export class LensModule {}
