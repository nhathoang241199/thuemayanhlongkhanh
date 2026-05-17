import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelCustomerBookingDto {
  @ApiProperty({ description: 'SĐT khách (khớp đơn)' })
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone: string;

  @ApiProperty({ description: 'Thông tin TK nhận hoàn 50%' })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  bankAccountInfo: string;
}
