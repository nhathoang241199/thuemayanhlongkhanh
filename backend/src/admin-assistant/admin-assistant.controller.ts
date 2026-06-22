import {
  Body,
  Controller,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAssistantService } from './admin-assistant.service';
import { isAdminAssistantConfigured } from './admin-assistant.config';
import { AdminAssistantChatDto } from './dto/chat.dto';

@ApiTags('admin-assistant')
@Controller('admin-assistant')
export class AdminAssistantController {
  constructor(private readonly assistant: AdminAssistantService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Trợ lý AI nội bộ (yêu cầu đăng nhập admin)',
  })
  @ApiOkResponse({
    schema: {
      properties: { reply: { type: 'string' } },
    },
  })
  async chat(@Body() dto: AdminAssistantChatDto): Promise<{ reply: string }> {
    if (!isAdminAssistantConfigured()) {
      throw new ServiceUnavailableException(
        'Trợ lý AI chưa bật hoặc thiếu ANTHROPIC_API_KEY',
      );
    }

    try {
      const reply = await this.assistant.chat(dto.messages);
      return { reply };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(
        msg.includes('ENOENT') && msg.includes('system.md')
          ? 'Trợ lý AI thiếu file cấu hình trên server — liên hệ kỹ thuật rebuild backend.'
          : `Trợ lý AI lỗi: ${msg}`,
      );
    }
  }
}
