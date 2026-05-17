import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MonthlySummaryResponseDto } from './dto/monthly-summary-response.dto';
import { RevenueByMonthResponseDto } from './dto/revenue-by-month-response.dto';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('revenue-by-month')
  @ApiOperation({
    summary: 'Doanh thu theo tháng (booking PAID)',
    description:
      'Tổng amount theo tháng calendar (UTC) của các booking có paymentStatus = PAID.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    example: 2026,
    description: 'Năm thống kê; mặc định năm hiện tại',
  })
  @ApiOkResponse({ type: RevenueByMonthResponseDto })
  revenueByMonth(
    @Query('year', new DefaultValuePipe(new Date().getUTCFullYear()), ParseIntPipe)
    year: number,
  ): Promise<RevenueByMonthResponseDto> {
    if (year < 2000 || year > 2100) {
      throw new BadRequestException('year must be between 2000 and 2100');
    }
    return this.statsService.revenueByMonth(year);
  }

  @Get('monthly-summary')
  @ApiOperation({
    summary: 'Tổng hợp một tháng: doanh thu, chi phí, lợi nhuận (UTC)',
    description:
      'Doanh thu: tổng Booking.amount (PAID) theo startBookingDate trong tháng. Chi phí: tổng Expense.amount theo expenseDate trong tháng. Lợi nhuận = doanh thu − chi phí.',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    example: 2026,
    description: 'Năm (UTC); mặc định năm hiện tại',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    example: 5,
    description: 'Tháng 1–12 (UTC); mặc định tháng hiện tại',
  })
  @ApiOkResponse({ type: MonthlySummaryResponseDto })
  monthlySummary(
    @Query('year', new DefaultValuePipe(new Date().getUTCFullYear()), ParseIntPipe)
    year: number,
    @Query(
      'month',
      new DefaultValuePipe(new Date().getUTCMonth() + 1),
      ParseIntPipe,
    )
    month: number,
  ): Promise<MonthlySummaryResponseDto> {
    if (year < 2000 || year > 2100) {
      throw new BadRequestException('year must be between 2000 and 2100');
    }
    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }
    return this.statsService.monthlySummary(year, month);
  }
}
