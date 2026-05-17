import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSlot } from '../../../generated/prisma/enums';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RequestChangeCustomerBookingDto {
  @ApiProperty()
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone: string;

  @ApiProperty()
  @IsString()
  cameraId: string;

  @ApiProperty({ example: '2026-05-20' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string;

  @ApiProperty({ example: '2026-05-21' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate: string;

  @ApiProperty({ enum: BookingSlot })
  @IsEnum(BookingSlot)
  slot: BookingSlot;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shippingAddress?: string;

  @ApiPropertyOptional({ description: 'Bắt buộc khi đơn mới rẻ hơn' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bankAccountInfo?: string;
}
