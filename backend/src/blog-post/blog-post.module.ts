import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BlogPostController } from './blog-post.controller';
import { BlogPostService } from './blog-post.service';

@Module({
  imports: [PrismaModule],
  controllers: [BlogPostController],
  providers: [BlogPostService],
  exports: [BlogPostService],
})
export class BlogPostModule {}
