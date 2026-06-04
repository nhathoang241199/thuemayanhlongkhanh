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
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePendingCustomerBookingDto {
  @ApiProperty()
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone: string;

  @ApiProperty()
  @IsString()
  cameraId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  lensId?: string | null;

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

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shippingAddress?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  returnNextMorning?: boolean;
}
