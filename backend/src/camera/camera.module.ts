import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CameraController } from './camera.controller';
import { CameraService } from './camera.service';

@Module({
  imports: [PrismaModule],
  controllers: [CameraController],
  providers: [CameraService],
})
export class CameraModule {}
