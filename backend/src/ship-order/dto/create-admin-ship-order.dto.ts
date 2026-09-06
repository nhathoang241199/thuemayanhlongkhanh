import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { ShipLeg } from '../ship-order.types';

export class CreateAdminShipOrderDto {
  @ApiProperty({ example: 'DH-20260906-ABCD' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  bookingCode: string;

  @ApiProperty({ enum: ['OUTBOUND', 'RETURN'] })
  @IsIn(['OUTBOUND', 'RETURN'])
  leg: ShipLeg;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  customerName: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @MinLength(9)
  @MaxLength(30)
  customerPhone: string;

  @ApiProperty({ example: '123 đường Nguyễn Ái Quốc, Long Khánh' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address: string;

  @ApiPropertyOptional({ description: 'Không gửi Messenger nếu true' })
  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}
