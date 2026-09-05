import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessengerModule } from '../messenger/messenger.module';
import { FanpagePostController } from './fanpage-post.controller';
import { FanpagePostService } from './fanpage-post.service';

@Module({
  imports: [PrismaModule, MessengerModule],
  controllers: [FanpagePostController],
  providers: [FanpagePostService],
  exports: [FanpagePostService],
})
export class FanpagePostModule {}
