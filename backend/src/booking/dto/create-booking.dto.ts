import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BookingSlot,
  BookingStatus,
  PaymentStatus,
} from '../../../generated/prisma/enums';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { IsEndBookingAfterStart } from './booking-date-range.validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'DH-2026-0001' })
  @IsString()
  @MaxLength(64)
  bookingCode: string;

  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  cameraId: string;

  @ApiProperty({ example: '2026-05-20T08:00:00.000Z' })
  @IsDateString()
  startBookingDate: string;

  @ApiProperty({ example: '2026-05-20T17:00:00.000Z' })
  @IsDateString()
  @IsEndBookingAfterStart()
  endBookingDate: string;

  @ApiProperty({ enum: BookingSlot })
  @IsEnum(BookingSlot)
  slot: BookingSlot;

  @ApiProperty({ example: 350000, minimum: 0 })
  @IsInt()
  @Min(0)
  amount: number;

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

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
