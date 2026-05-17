import { ApiProperty } from '@nestjs/swagger';

export class RevenueMonthRowDto {
  @ApiProperty({ example: '2026-05' })
  month: string;

  @ApiProperty({ example: 350000 })
  revenue: number;

  @ApiProperty({ example: 4 })
  bookingCount: number;
}

export class RevenueByMonthResponseDto {
  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ type: [RevenueMonthRowDto] })
  months: RevenueMonthRowDto[];
}
