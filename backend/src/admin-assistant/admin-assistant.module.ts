import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { CameraModule } from '../camera/camera.module';
import { LensModule } from '../lens/lens.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopClosureModule } from '../shop-closure/shop-closure.module';
import { StatsModule } from '../stats/stats.module';
import { AdminAssistantController } from './admin-assistant.controller';
import { AdminAssistantService } from './admin-assistant.service';
import { AdminAssistantToolsService } from './admin-assistant-tools.service';

@Module({
  imports: [
    PrismaModule,
    StatsModule,
    CameraModule,
    LensModule,
    AvailabilityModule,
    ShopClosureModule,
  ],
  controllers: [AdminAssistantController],
  providers: [AdminAssistantToolsService, AdminAssistantService],
})
export class AdminAssistantModule {}
