import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFanpagePostDraftDto {
  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;

  @ApiPropertyOptional({
    description: 'true = đăng công khai trên fanpage; mặc định false (private, chỉ admin Meta thấy)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  publishPublic?: boolean;

  @ApiPropertyOptional({ default: 'hermes' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  promotionNote?: string;
}

export class UpdateFanpagePostDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  publishPublic?: boolean;
}

export class RejectFanpagePostDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectNote?: string;
}

export type FanpagePostStatus = 'pending' | 'published' | 'rejected';
