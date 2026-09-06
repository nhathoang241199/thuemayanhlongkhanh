import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerReturnPhoneDto {
  @ApiProperty({ example: '0901234567' })
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ example: '12 Nguyễn Trãi, Long Khánh' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  returnAddress?: string;
}
