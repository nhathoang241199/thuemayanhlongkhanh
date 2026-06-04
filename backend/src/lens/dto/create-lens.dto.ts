import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLensDto {
  @ApiProperty({ example: 'RF 50mm f/1.8' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: ['clxxx', 'clyyy'],
    description: 'Máy ảnh tương thích (cùng hãng)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cameraIds: string[];

  @ApiProperty({ example: 2, minimum: 0 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 100000, minimum: 0 })
  @IsInt()
  @Min(0)
  dayPrice: number;

  @ApiProperty({ example: 80000, minimum: 0 })
  @IsInt()
  @Min(0)
  shiftPrice: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ example: 'https://example.com/lens.jpg' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;
}
