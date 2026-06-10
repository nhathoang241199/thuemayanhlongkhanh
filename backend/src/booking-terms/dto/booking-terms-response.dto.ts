import { ApiProperty } from '@nestjs/swagger';

export class BookingTermsResponseDto {
  @ApiProperty({ example: '1. Khách cần mang CMND/CCCD khi nhận máy.' })
  content: string;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z', required: false })
  updatedAt?: string;
}
