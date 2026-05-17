import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Mua thẻ nhớ' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 500000, minimum: 0 })
  @IsInt()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2026-04-15T12:00:00.000Z' })
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
