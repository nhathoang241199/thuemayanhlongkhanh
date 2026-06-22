import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { monthRangeUtc } from '../common/month-range-utc';
import { PrismaService } from '../prisma/prisma.service';
import { EquipmentValueResponseDto } from './dto/equipment-value-response.dto';
import { MonthlySummaryResponseDto } from './dto/monthly-summary-response.dto';
import { RevenueByMonthResponseDto } from './dto/revenue-by-month-response.dto';

type RawRow = {
  month: string;
  revenue: bigint;
  bookingCount: bigint;
};

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenueByMonth(year: number): Promise<RevenueByMonthResponseDto> {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

    const rows = await this.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT
        to_char(date_trunc('month', "startBookingDate"), 'YYYY-MM') AS month,
        SUM("amount")::bigint AS revenue,
        COUNT(*)::bigint AS "bookingCount"
      FROM "Booking"
      WHERE "paymentStatus" = 'PAID'
        AND "startBookingDate" >= ${start}
        AND "startBookingDate" < ${end}
      GROUP BY date_trunc('month', "startBookingDate")
      ORDER BY date_trunc('month', "startBookingDate")
    `);

    const byMonth = new Map<string, RawRow>();
    for (const r of rows) {
      byMonth.set(r.month, r);
    }

    const months: RevenueByMonthResponseDto['months'] = [];
    for (let m = 0; m < 12; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      const hit = byMonth.get(key);
      months.push({
        month: key,
        revenue: hit ? Number(hit.revenue) : 0,
        bookingCount: hit ? Number(hit.bookingCount) : 0,
      });
    }

    return { year, months };
  }

  async monthlySummary(
    year: number,
    month: number,
  ): Promise<MonthlySummaryResponseDto> {
    const { start, end } = monthRangeUtc(year, month);

    const [bookingAgg, expenseAgg] = await Promise.all([
      this.prisma.booking.aggregate({
        where: {
          paymentStatus: 'PAID',
          startBookingDate: { gte: start, lt: end },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: {
          expenseDate: { gte: start, lt: end },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const revenue = bookingAgg._sum.amount ?? 0;
    const expenses = expenseAgg._sum.amount ?? 0;
    const profit = revenue - expenses;

    return {
      year,
      month,
      revenue,
      expenses,
      profit,
      bookingCount: bookingAgg._count,
      expenseCount: expenseAgg._count,
    };
  }

  async equipmentValue(): Promise<EquipmentValueResponseDto> {
    const [cameras, lenses] = await Promise.all([
      this.prisma.camera.findMany({
        select: { quantity: true, purchasePrice: true },
      }),
      this.prisma.lens.findMany({
        select: { quantity: true, purchasePrice: true },
      }),
    ]);

    let totalCameraValue = 0;
    let cameraUnitCount = 0;
    for (const c of cameras) {
      totalCameraValue += c.purchasePrice * c.quantity;
      cameraUnitCount += c.quantity;
    }

    let totalLensValue = 0;
    let lensUnitCount = 0;
    for (const l of lenses) {
      totalLensValue += l.purchasePrice * l.quantity;
      lensUnitCount += l.quantity;
    }

    return {
      totalCameraValue,
      totalLensValue,
      totalEquipmentValue: totalCameraValue + totalLensValue,
      cameraUnitCount,
      lensUnitCount,
    };
  }

  async topCustomersByRevenue(
    year: number,
    month: number,
    limit = 5,
  ): Promise<
    Array<{
      name: string;
      customerTag: string;
      totalRevenue: number;
      bookingCount: number;
    }>
  > {
    const { start, end } = monthRangeUtc(year, month);
    const take = Math.min(20, Math.max(1, limit));

    const groups = await this.prisma.booking.groupBy({
      by: ['customerId'],
      where: {
        paymentStatus: 'PAID',
        startBookingDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take,
    });

    if (groups.length === 0) return [];

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: groups.map((g) => g.customerId) } },
      select: { id: true, name: true, customerTag: true },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));

    return groups.map((g) => {
      const c = byId.get(g.customerId);
      return {
        name: c?.name ?? 'Không rõ',
        customerTag: c?.customerTag ?? 'NORMAL',
        totalRevenue: g._sum.amount ?? 0,
        bookingCount: g._count,
      };
    });
  }
}
