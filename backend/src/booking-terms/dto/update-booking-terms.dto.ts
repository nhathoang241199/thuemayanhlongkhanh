import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateBookingTermsDto {
  @ApiProperty({
    example: '1. Khách cần mang CMND/CCCD khi nhận máy.\n2. ...',
    description: 'Nội dung điều khoản; để trống = không bắt khách xác nhận',
  })
  @IsString()
  content: string;
}
