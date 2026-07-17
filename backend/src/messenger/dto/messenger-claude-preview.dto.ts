import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const MESSENGER_HISTORY_LIMIT = 20;

class MessengerHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(8000)
  content!: string;
}

export class MessengerClaudePreviewDto {
  @IsArray()
  @ArrayMaxSize(MESSENGER_HISTORY_LIMIT)
  @ValidateNested({ each: true })
  @Type(() => MessengerHistoryMessageDto)
  history!: MessengerHistoryMessageDto[];

  /** Thêm tin user sau history (vd. câu hỏi mới nhất). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  currentUserMessage?: string;
}
