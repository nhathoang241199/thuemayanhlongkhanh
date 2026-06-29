import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EquipmentDiscountResponseDto {
  @ApiProperty({ example: 20 })
  discountPercent: number;

  @ApiPropertyOptional({ example: '2026-06-01', nullable: true })
  startDate: string | null;

  @ApiPropertyOptional({ example: '2026-06-30', nullable: true })
  endDate: string | null;

  @ApiPropertyOptional({ example: '2026-06-25T10:00:00.000Z' })
  updatedAt?: string;
}

export class ApplyEquipmentDiscountResponseDto extends EquipmentDiscountResponseDto {
  @ApiProperty({ example: 12 })
  cameraCount: number;

  @ApiProperty({ example: 8 })
  lensCount: number;
}

export class PublicPromotionResponseDto {
  @ApiProperty({ example: 20 })
  discountPercent: number;

  @ApiPropertyOptional({ example: '2026-06-01', nullable: true })
  startDate: string | null;

  @ApiPropertyOptional({ example: '2026-06-30', nullable: true })
  endDate: string | null;
}
