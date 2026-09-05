import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { MAX_BLOG_BANNER_BYTES } from '../common/upload-config';
import { BlogPostService } from './blog-post.service';
import {
  RejectBlogPostDto,
  UpdateBlogPostDto,
} from './dto/blog-post.dto';

@ApiTags('blog-posts')
@Controller('blog-posts')
export class BlogPostController {
  constructor(private readonly posts: BlogPostService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Danh sách bài blog đã xuất bản (SEO)' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  listPublic(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.posts.listPublic(
      limit ? Number(limit) : 9,
      offset ? Number(offset) : 0,
    );
  }

  @Public()
  @Get('public/slugs')
  @ApiOperation({ summary: 'Slug bài đã xuất bản (sitemap)' })
  listSlugs() {
    return this.posts.listPublishedSlugs();
  }

  @Public()
  @Get('public/:slug')
  @ApiOperation({ summary: 'Chi tiết bài blog theo slug' })
  getPublic(@Param('slug') slug: string) {
    return this.posts.getBySlugPublic(slug);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách bài blog (admin)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'published', 'rejected'],
  })
  list(@Query('status') status?: 'pending' | 'published' | 'rejected') {
    return this.posts.list(status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa bài chờ duyệt' })
  update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.posts.update(id, dto);
  }

  @Post(':id/banner')
  @ApiOperation({ summary: 'Upload banner bài blog (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BLOG_BANNER_BYTES },
    }),
  )
  uploadBanner(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_BLOG_BANNER_BYTES }),
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/png|image\/webp)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.posts.uploadBanner(id, file);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Duyệt và xuất bản bài blog' })
  publish(@Param('id') id: string) {
    return this.posts.publish(id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Từ chối bài blog' })
  reject(@Param('id') id: string, @Body() dto: RejectBlogPostDto) {
    return this.posts.reject(id, dto);
  }
}
