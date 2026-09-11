import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { HermesApiAccess } from '../auth/hermes-api.decorator';
import {
  RejectFanpagePostDraftDto,
  UpdateFanpagePostDraftDto,
} from './dto/fanpage-post.dto';
import { HermesApiAccess } from '../auth/hermes-api.decorator';
import { FanpagePostService } from './fanpage-post.service';

@ApiTags('fanpage-posts')
@Controller('fanpage-posts')
export class FanpagePostController {
  constructor(private readonly posts: FanpagePostService) {}

  @Get()
  @HermesApiAccess()
  @ApiOperation({ summary: 'Danh sách bài fanpage (admin duyệt)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'published', 'rejected'],
  })
  list(@Query('status') status?: 'pending' | 'published' | 'rejected') {
    return this.posts.list(status);
  }

  @Patch(':id')
  @HermesApiAccess()
  @ApiOperation({ summary: 'Sửa bài chờ duyệt' })
  update(@Param('id') id: string, @Body() dto: UpdateFanpagePostDraftDto) {
    return this.posts.update(id, dto);
  }

  @Post(':id/approve')
  @HermesApiAccess()
  @ApiOperation({ summary: 'Duyệt và đăng lên fanpage' })
  approve(@Param('id') id: string) {
    return this.posts.approve(id);
  }

  @Post(':id/reject')
  @HermesApiAccess()
  @ApiOperation({ summary: 'Từ chối bài đăng' })
  reject(@Param('id') id: string, @Body() dto: RejectFanpagePostDraftDto) {
    return this.posts.reject(id, dto);
  }
}
