import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerTag } from '../../../generated/prisma/enums';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '0909123456' })
  @IsString()
  @MaxLength(32)
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  facebookUrl?: string;

  @ApiPropertyOptional({ type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  verificationImageUrls?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ enum: CustomerTag })
  @IsOptional()
  @IsEnum(CustomerTag)
  customerTag?: CustomerTag;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
