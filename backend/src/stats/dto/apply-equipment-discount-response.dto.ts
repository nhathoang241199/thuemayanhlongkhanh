import { ApiProperty } from '@nestjs/swagger';

export class ApplyEquipmentDiscountResponseDto {
  @ApiProperty({ example: 20 })
  discountPercent: number;

  @ApiProperty({ example: 12 })
  cameraCount: number;

  @ApiProperty({ example: 8 })
  lensCount: number;
}
