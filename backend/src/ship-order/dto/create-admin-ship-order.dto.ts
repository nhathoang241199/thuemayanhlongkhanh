import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminShipOrderDto {
  @ApiProperty({ description: 'ID booking được chọn' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  bookingId: string;

  @ApiProperty({ example: '123 đường Nguyễn Ái Quốc, Long Khánh' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address: string;

  @ApiProperty({ example: '2026-09-06T10:30:00.000Z' })
  @IsDateString()
  scheduleAt: string;
}
