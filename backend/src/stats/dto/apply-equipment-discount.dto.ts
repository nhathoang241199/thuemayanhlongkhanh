import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class ApplyEquipmentDiscountDto {
  @ApiProperty({ example: 20, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent: number;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate phải dạng YYYY-MM-DD',
  })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate phải dạng YYYY-MM-DD',
  })
  endDate?: string;
}
