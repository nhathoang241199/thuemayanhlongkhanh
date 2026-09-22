import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShopInfoResponseDto {
  @ApiProperty({ example: '0901234567' })
  phone: string;

  @ApiProperty({ example: '123 Nguyễn Du, Long Khánh' })
  address: string;

  @ApiProperty({ example: 'https://maps.app.goo.gl/...' })
  mapUrl: string;

  @ApiPropertyOptional({ example: 10.9405036, nullable: true })
  latitude: number | null;

  @ApiPropertyOptional({ example: 107.225559, nullable: true })
  longitude: number | null;

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

  @ApiPropertyOptional({ example: 10.9405036, nullable: true })
  latitude: number | null;

  @ApiPropertyOptional({ example: 107.225559, nullable: true })
  longitude: number | null;

  @ApiPropertyOptional({
    example: 'https://www.google.com/maps?q=10.94,107.22&output=embed',
    nullable: true,
    description: 'URL iframe bản đồ (luôn sẵn nếu resolve được từ mapUrl/địa chỉ)',
  })
  mapEmbedUrl: string | null;
}
