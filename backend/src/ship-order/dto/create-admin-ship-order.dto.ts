import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAdminShipOrderDto {
  @ApiProperty({ description: 'ID booking được chọn' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  bookingId: string;

  @ApiProperty({ enum: ['OUTBOUND', 'RETURN'] })
  @IsIn(['OUTBOUND', 'RETURN'])
  leg: 'OUTBOUND' | 'RETURN';

  @ApiProperty({ description: 'ID shipper được gán' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  shipperId: string;

  @ApiProperty({ example: '123 đường Nguyễn Ái Quốc, Long Khánh' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address: string;

  @ApiProperty({ example: '2026-09-06T10:30:00.000Z' })
  @IsDateString()
  scheduleAt: string;
}
