import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CompletePendingLearnDto,
  UpdateMessengerLearnExampleDto,
} from './dto/messenger-learn.dto';
import { MessengerLearnService } from './messenger-learn.service';

@ApiTags('messenger-learn')
@Controller('messenger/learn')
export class MessengerLearnController {
  constructor(private readonly learn: MessengerLearnService) {}

  @Get('status')
  @ApiOperation({ summary: 'Trạng thái chế độ học Messenger' })
  getStatus() {
    return this.learn.getStatus();
  }

  @Post('sync')
  @ApiOperation({
    summary: 'Đồng bộ câu trả lời từ Facebook Inbox (Graph API)',
  })
  async syncFromFacebook() {
    return this.learn.syncAllPendingFromGraph();
  }

  @Post('pending/:psid/complete')
  @ApiOperation({ summary: 'Ghi thủ công câu shop trả lời cho tin chờ' })
  async completePending(
    @Param('psid') psid: string,
    @Body() dto: CompletePendingLearnDto,
  ) {
    await this.learn.completePendingManually(psid, dto.ownerReply);
    return { ok: true };
  }

  @Get('pending')
  @ApiOperation({ summary: 'Tin khách chờ shop trả lời (chưa ghép cặp)' })
  async listPending() {
    const rows = await this.learn.listPendingTurns();
    return rows.map((row) => ({
      psid: row.psid,
      userMessage: row.userMessage,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê mẫu học' })
  getStats() {
    return this.learn.stats();
  }

  @Get('examples')
  @ApiOperation({ summary: 'Danh sách mẫu (khách → shop trả lời)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  @ApiOkResponse({ type: [Object] })
  async listExamples(
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    const rows = await this.learn.listExamples(status);
    return rows.map((row) => ({
      id: row.id,
      userMessage: row.userMessage,
      ownerReply: row.ownerReply,
      status: row.status,
      note: row.note,
      psid: row.conversation.psid,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  @Patch('examples/:id')
  @ApiOperation({ summary: 'Duyệt / từ chối mẫu học' })
  async updateExample(
    @Param('id') id: string,
    @Body() dto: UpdateMessengerLearnExampleDto,
  ) {
    const row = await this.learn.updateExample(id, dto);
    return {
      id: row.id,
      userMessage: row.userMessage,
      ownerReply: row.ownerReply,
      status: row.status,
      note: row.note,
      psid: row.conversation.psid,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
