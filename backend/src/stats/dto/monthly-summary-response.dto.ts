import { ApiProperty } from '@nestjs/swagger';

export class MonthlySummaryResponseDto {
  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 5, description: 'Tháng 1–12 (UTC)' })
  month: number;

  @ApiProperty({ example: 350000 })
  revenue: number;

  @ApiProperty({ example: 120000 })
  expenses: number;

  @ApiProperty({ example: 230000 })
  profit: number;

  @ApiProperty({ example: 3 })
  bookingCount: number;

  @ApiProperty({ example: 2 })
  expenseCount: number;
}
