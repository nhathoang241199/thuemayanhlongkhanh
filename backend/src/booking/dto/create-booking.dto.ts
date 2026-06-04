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
  ValidateIf,
} from 'class-validator';
import { IsEndBookingAfterStart } from './booking-date-range.validator';

export class CreateBookingDto {
  @ApiPropertyOptional({
    example: 'DH-2026-0001',
    description: 'Bỏ trống để hệ thống tự sinh mã',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  bookingCode?: string;

  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  cameraId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  lensId?: string | null;

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

  @ApiPropertyOptional({
    example: '2026-05-20T00:00:00.000Z',
    description: 'Thời gian nhận máy (ISO UTC)',
  })
  @IsOptional()
  @IsDateString()
  pickupAt?: string;

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
