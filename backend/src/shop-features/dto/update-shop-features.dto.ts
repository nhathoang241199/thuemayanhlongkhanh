import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateShopFeaturesDto {
  @ApiProperty({
    example: true,
    description: 'Bật nút in hợp đồng trên trang đơn thuê admin',
  })
  @IsBoolean()
  printEnabled: boolean;

  @ApiProperty({
    example: true,
    description: 'Bật bước đặt cọc online khi khách đặt lịch',
  })
  @IsBoolean()
  depositEnabled: boolean;

  @ApiProperty({
    example: true,
    description: 'Bật tùy chọn giao hàng khi khách đặt lịch',
  })
  @IsBoolean()
  shipEnabled: boolean;
}
