import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMessengerLearnExampleDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class CompletePendingLearnDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  ownerReply!: string;
}

export class MessengerLearnExampleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userMessage!: string;

  @ApiProperty()
  ownerReply!: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  status!: string;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiProperty()
  psid!: string;

  @ApiProperty()
  createdAt!: string;
}
