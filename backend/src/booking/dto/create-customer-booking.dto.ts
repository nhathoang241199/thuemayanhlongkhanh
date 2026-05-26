import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSlot } from '../../../generated/prisma/enums';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateCustomerBookingDto {
  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  cameraId: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate phải dạng YYYY-MM-DD',
  })
  startDate: string;

  @ApiProperty({ example: '2026-05-05' })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate phải dạng YYYY-MM-DD',
  })
  endDate: string;

  @ApiProperty({ enum: BookingSlot })
  @IsEnum(BookingSlot)
  slot: BookingSlot;

  @ApiProperty({
    example: '2026-05-20T00:00:00.000Z',
    description: 'Thời gian nhận máy (ISO UTC)',
  })
  @IsDateString()
  pickupAt: string;

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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  returnNextMorning?: boolean;
}
