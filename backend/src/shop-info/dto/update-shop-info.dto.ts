import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateShopInfoDto {
  @ApiProperty({ example: '0901234567', description: 'Số điện thoại shop' })
  @IsString()
  @MaxLength(32)
  phone: string;

  @ApiProperty({
    example: '123 Nguyễn Du, Long Khánh, Đồng Nai',
    description: 'Địa chỉ hiển thị cho khách',
  })
  @IsString()
  @MaxLength(500)
  address: string;

  @ApiPropertyOptional({
    example: 'https://maps.app.goo.gl/...',
    description: 'Link Google Maps; để trống = dùng cấu hình build',
  })
  @IsString()
  @MaxLength(500)
  mapUrl: string;
}
