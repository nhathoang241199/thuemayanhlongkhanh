import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAdminShipOrderDto {
  @ApiPropertyOptional({ enum: ['OUTBOUND', 'RETURN'] })
  @IsOptional()
  @IsIn(['OUTBOUND', 'RETURN'])
  leg?: 'OUTBOUND' | 'RETURN';

  @ApiPropertyOptional({ description: 'ID shipper được gán' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  shipperId?: string;

  @ApiPropertyOptional({ example: '123 đường Nguyễn Ái Quốc, Long Khánh' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: '2026-09-06T10:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduleAt?: string;
}
