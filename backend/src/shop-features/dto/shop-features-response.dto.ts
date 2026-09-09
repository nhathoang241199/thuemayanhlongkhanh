import { ApiProperty } from '@nestjs/swagger';

export class ShopFeaturesResponseDto {
  @ApiProperty({ example: true })
  printEnabled: boolean;

  @ApiProperty({ example: true })
  depositEnabled: boolean;

  @ApiProperty({ example: true })
  shipEnabled: boolean;

  @ApiProperty({ example: '2026-08-07T04:00:00.000Z' })
  updatedAt: string;
}

export class PublicShopFeaturesResponseDto {
  @ApiProperty({ example: true })
  depositEnabled: boolean;

  @ApiProperty({ example: true })
  shipEnabled: boolean;
}
