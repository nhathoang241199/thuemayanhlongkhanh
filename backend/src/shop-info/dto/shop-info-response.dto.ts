import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShopInfoResponseDto {
  @ApiProperty({ example: '0901234567' })
  phone: string;

  @ApiProperty({ example: '123 Nguyễn Du, Long Khánh' })
  address: string;

  @ApiProperty({ example: 'https://maps.app.goo.gl/...' })
  mapUrl: string;

  @ApiPropertyOptional()
  updatedAt?: string;
}

export class PublicShopInfoResponseDto {
  @ApiProperty({ example: '0901234567' })
  phone: string;

  @ApiProperty({ example: '123 Nguyễn Du, Long Khánh' })
  address: string;

  @ApiProperty({ example: 'https://maps.app.goo.gl/...' })
  mapUrl: string;
}
