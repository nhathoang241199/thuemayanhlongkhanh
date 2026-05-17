import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSlot } from '../../../generated/prisma/enums';
import {
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
}
