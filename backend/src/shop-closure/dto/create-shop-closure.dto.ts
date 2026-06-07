import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateShopClosureDto {
  @ApiProperty({ example: '2026-06-10' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-16' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'Shop nghỉ lễ' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
