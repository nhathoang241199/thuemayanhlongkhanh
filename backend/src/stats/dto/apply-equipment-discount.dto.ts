import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class ApplyEquipmentDiscountDto {
  @ApiProperty({ example: 20, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent: number;
}
