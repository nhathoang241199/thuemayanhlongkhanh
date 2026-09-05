import { Module } from '@nestjs/common';
import { BlogPostModule } from '../blog-post/blog-post.module';
import { FanpagePostModule } from '../fanpage-post/fanpage-post.module';
import { MessengerModule } from '../messenger/messenger.module';
import { StatsModule } from '../stats/stats.module';
import { HermesController } from './hermes.controller';
import { HermesService } from './hermes.service';

@Module({
  imports: [StatsModule, MessengerModule, FanpagePostModule, BlogPostModule],
  controllers: [HermesController],
  providers: [HermesService],
})
export class HermesModule {}
