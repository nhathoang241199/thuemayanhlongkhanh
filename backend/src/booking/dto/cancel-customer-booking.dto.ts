import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelCustomerBookingDto {
  @ApiProperty({ description: 'SĐT khách (khớp đơn)' })
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({
    description: 'TK nhận hoàn 40k cọc (bắt buộc khi hủy trước lấy máy >24h)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bankAccountInfo?: string;
}
