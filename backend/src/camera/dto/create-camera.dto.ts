import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CameraBrand } from '../../../generated/prisma/enums';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateCameraDto {
  @ApiProperty({ enum: CameraBrand })
  @IsEnum(CameraBrand)
  brand: CameraBrand;

  @ApiProperty({ example: 'X-T5 kit 18-55' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 3, minimum: 0 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 350000, minimum: 0 })
  @IsInt()
  @Min(0)
  dayPrice: number;

  @ApiProperty({ example: 200000, minimum: 0 })
  @IsInt()
  @Min(0)
  shiftPrice: number;

  @ApiPropertyOptional({ example: 20, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ example: 'https://example.com/cam.jpg' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 'https://www.youtube.com/watch?v=xxxxxxxxxxx',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  tutorialVideoUrl?: string;
}
