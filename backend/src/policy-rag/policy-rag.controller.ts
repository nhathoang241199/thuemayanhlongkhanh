import {
  Body,
  Controller,
  Get,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PolicyRagQuestionDto } from './dto/policy-rag-question.dto';
import { PolicyRagBatchSearchDto } from './dto/policy-rag-batch-search.dto';
import { PolicyRagAskService, toClaudeApiRequest } from './policy-rag-ask.service';
import {
  getPolicyRagConfig,
  isPolicyRagAskConfigured,
  isPolicyRagConfigured,
} from './policy-rag.config';
import { PolicyRagIndexService } from './policy-rag-index.service';
import { PolicyRagRetrieveService } from './policy-rag-retrieve.service';
import { BOOKING_TERMS_SOURCE_ID } from './policy-rag.types';
import { POLICY_RAG_BATCH_TEST_QUESTIONS } from './policy-rag-test-cases';

@ApiTags('policy-rag')
@Controller('policy-rag')
export class PolicyRagController {
  constructor(
    private readonly index: PolicyRagIndexService,
    private readonly retrieve: PolicyRagRetrieveService,
    private readonly askService: PolicyRagAskService,
  ) {}

  private assertRagEnabled(): void {
    if (!isPolicyRagConfigured()) {
      throw new ServiceUnavailableException(
        'Policy RAG chưa bật hoặc thiếu OPENAI_API_KEY',
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Trạng thái Policy RAG (admin)' })
  async status(): Promise<{
    enabled: boolean;
    askEnabled: boolean;
    chunkCount: number;
    sourceId: string;
    lastIndexedAt: string | null;
  }> {
    const config = getPolicyRagConfig();
    const chunkCount = config.enabled
      ? await this.index.countChunks(BOOKING_TERMS_SOURCE_ID)
      : 0;
    const lastIndexedAt = config.enabled
      ? await this.index.latestIndexedAt(BOOKING_TERMS_SOURCE_ID)
      : null;

    return {
      enabled: config.enabled,
      askEnabled: isPolicyRagAskConfigured(config),
      chunkCount,
      sourceId: BOOKING_TERMS_SOURCE_ID,
      lastIndexedAt,
    };
  }

  @Get('chunks')
  @ApiOperation({ summary: 'Liệt kê chunk đã index (admin)' })
  async chunks() {
    this.assertRagEnabled();
    const rows = await this.index.listChunks(BOOKING_TERMS_SOURCE_ID);
    return {
      sourceId: BOOKING_TERMS_SOURCE_ID,
      chunks: rows.map((row) => ({
        id: row.id,
        section: row.section,
        chunkIndex: row.chunkIndex,
        content: row.content,
        createdAt: new Date(row.createdAt).toISOString(),
      })),
    };
  }

  @Post('search')
  @ApiOperation({
    summary: 'Retrieve-only — debug embedding (admin)',
  })
  async search(@Body() dto: PolicyRagQuestionDto) {
    this.assertRagEnabled();
    const chunks = await this.retrieve.search(
      BOOKING_TERMS_SOURCE_ID,
      dto.question,
    );
    return { question: dto.question, chunks };
  }

  @Get('test-cases')
  @ApiOperation({ summary: 'Danh sách câu hỏi mẫu để test batch (admin)' })
  testCases() {
    return { questions: [...POLICY_RAG_BATCH_TEST_QUESTIONS] };
  }

  @Post('batch-search')
  @ApiOperation({
    summary: 'Retrieve nhiều câu hỏi một lần — debug dài (admin)',
  })
  async batchSearch(@Body() dto: PolicyRagBatchSearchDto) {
    this.assertRagEnabled();
    const results: {
      question: string;
      chunks: Awaited<ReturnType<PolicyRagRetrieveService['search']>>;
      topSection: string | null;
      topScore: number | null;
    }[] = [];

    for (const raw of dto.questions) {
      const question = raw.trim();
      if (!question) continue;
      const chunks = await this.retrieve.search(
        BOOKING_TERMS_SOURCE_ID,
        question,
      );
      results.push({
        question,
        chunks,
        topSection: chunks[0]?.section ?? null,
        topScore: chunks[0]?.score ?? null,
      });
    }

    return { count: results.length, results };
  }

  @Post('preview')
  @ApiOperation({
    summary: 'Xem payload gửi Claude — retrieve only, không gọi API (admin)',
  })
  async preview(@Body() dto: PolicyRagQuestionDto) {
    this.assertRagEnabled();
    const trimmed = dto.question.trim();
    if (!trimmed) {
      return {
        question: '',
        emptyQuestion: true,
        preview: null,
      };
    }

    const preview = await this.askService.previewAsk(trimmed);
    if (!preview) {
      return {
        question: trimmed,
        noChunks: true,
        preview: null,
      };
    }

    return {
      question: trimmed,
      preview: {
        model: preview.model,
        maxTokens: preview.maxTokens,
        system: preview.system,
        userMessage: preview.userMessage,
        messages: preview.messages,
        chunks: preview.chunks,
        claudeApiRequest: toClaudeApiRequest(preview),
      },
    };
  }

  @Post('ask')
  @ApiOperation({ summary: 'Full RAG: retrieve + Claude (admin)' })
  async ask(@Body() dto: PolicyRagQuestionDto) {
    if (!isPolicyRagAskConfigured()) {
      throw new ServiceUnavailableException(
        'Policy RAG ask cần OPENAI_API_KEY và ANTHROPIC_API_KEY',
      );
    }

    try {
      return await this.askService.ask(dto.question);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(`Policy RAG lỗi: ${msg}`);
    }
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Re-index từ BookingTerms trong DB (admin)' })
  async reindex() {
    this.assertRagEnabled();
    try {
      const chunkCount = await this.index.reindexFromDbBookingTerms();
      const lastIndexedAt =
        await this.index.latestIndexedAt(BOOKING_TERMS_SOURCE_ID);
      return { chunkCount, lastIndexedAt };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(`Re-index thất bại: ${msg}`);
    }
  }
}
