import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MESSENGER_HISTORY_LIMIT } from './messenger-claude-preview.dto';

class MessengerSimulateHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(8000)
  content!: string;
}

export class MessengerSimulateChatDto {
  @IsArray()
  @ArrayMaxSize(MESSENGER_HISTORY_LIMIT - 1)
  @ValidateNested({ each: true })
  @Type(() => MessengerSimulateHistoryMessageDto)
  history!: MessengerSimulateHistoryMessageDto[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  userMessage!: string;
}
