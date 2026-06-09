import { ApiProperty } from '@nestjs/swagger';

export class EquipmentValueResponseDto {
  @ApiProperty({ example: 75_000_000, description: 'Tổng giá mua máy ảnh (× số lượng)' })
  totalCameraValue: number;

  @ApiProperty({ example: 16_000_000, description: 'Tổng giá mua ống kính (× số lượng)' })
  totalLensValue: number;

  @ApiProperty({ example: 91_000_000 })
  totalEquipmentValue: number;

  @ApiProperty({ example: 5, description: 'Tổng số máy (theo quantity)' })
  cameraUnitCount: number;

  @ApiProperty({ example: 3, description: 'Tổng số ống kính (theo quantity)' })
  lensUnitCount: number;
}
