import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  assertDateStr,
  eachCalendarDayVN,
  toCalendarDayVN,
} from '../common/booking-schedule';
import { monthRangeUtc } from '../common/month-range-utc';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopClosureDto } from './dto/create-shop-closure.dto';

export type FindAllShopClosuresQuery = {
  year?: number;
  month?: number;
};

function calendarDateToDbDate(dateStr: string): Date {
  assertDateStr(dateStr);
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function lastDayOfMonth(year: number, month: number): string {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const d = String(daysInMonth).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

@Injectable()
export class ShopClosureService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query?: FindAllShopClosuresQuery) {
    const where: Prisma.ShopClosureWhereInput = {};

    if (query?.year !== undefined && query?.month !== undefined) {
      const monthStart = calendarDateToDbDate(
        `${query.year}-${String(query.month).padStart(2, '0')}-01`,
      );
      const monthEnd = calendarDateToDbDate(
        lastDayOfMonth(query.year, query.month),
      );
      where.startDate = { lte: monthEnd };
      where.endDate = { gte: monthStart };
    }

    return this.prisma.shopClosure.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.shopClosure.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`ShopClosure ${id} not found`);
    }
    return row;
  }

  create(dto: CreateShopClosureDto) {
    assertDateStr(dto.startDate);
    assertDateStr(dto.endDate);
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate phải >= startDate');
    }

    return this.prisma.shopClosure.create({
      data: {
        startDate: calendarDateToDbDate(dto.startDate),
        endDate: calendarDateToDbDate(dto.endDate),
        note: dto.note?.trim() || null,
      },
    });
  }

  async remove(id: string) {
    try {
      return await this.prisma.shopClosure.delete({ where: { id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`ShopClosure ${id} not found`);
      }
      throw e;
    }
  }

  async isDateClosed(dateStr: string): Promise<boolean> {
    assertDateStr(dateStr);
    const date = calendarDateToDbDate(dateStr);
    const row = await this.prisma.shopClosure.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { id: true },
    });
    return row !== null;
  }

  async closedDatesInRange(
    startDate: string,
    endDate: string,
  ): Promise<string[]> {
    assertDateStr(startDate);
    assertDateStr(endDate);
    const start = calendarDateToDbDate(startDate);
    const end = calendarDateToDbDate(endDate);

    const closures = await this.prisma.shopClosure.findMany({
      where: {
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { startDate: true, endDate: true },
    });

    const closed = new Set<string>();
    for (const c of closures) {
      const cStart = toCalendarDayVN(c.startDate);
      const cEnd = toCalendarDayVN(c.endDate);
      const clipStart = cStart < startDate ? startDate : cStart;
      const clipEnd = cEnd > endDate ? endDate : cEnd;
      for (const d of eachCalendarDayVN(clipStart, clipEnd)) {
        closed.add(d);
      }
    }
    return [...closed].sort();
  }

  async assertRangeNotClosed(startDate: string, endDate: string): Promise<void> {
    const closed = await this.closedDatesInRange(startDate, endDate);
    if (closed.length > 0) {
      throw new BadRequestException(
        'Shop nghỉ trong một hoặc nhiều ngày đã chọn',
      );
    }
  }

  async closedMonth(year: number, month: number) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be 1-12');
    }

    const { start, end } = monthRangeUtc(year, month);
    const monthStartStr = toCalendarDayVN(start);
    const monthEndDate = new Date(end.getTime() - 86400000);
    const monthEndStr = toCalendarDayVN(monthEndDate);

    const closures = await this.prisma.shopClosure.findMany({
      where: {
        startDate: { lte: monthEndDate },
        endDate: { gte: start },
      },
      select: { startDate: true, endDate: true },
    });

    const closedSet = new Set<string>();
    for (const c of closures) {
      const cStart = toCalendarDayVN(c.startDate);
      const cEnd = toCalendarDayVN(c.endDate);
      const clipStart = cStart < monthStartStr ? monthStartStr : cStart;
      const clipEnd = cEnd > monthEndStr ? monthEndStr : cEnd;
      for (const d of eachCalendarDayVN(clipStart, clipEnd)) {
        closedSet.add(d);
      }
    }

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const days: { date: string; closed: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, closed: closedSet.has(dateStr) });
    }

    return { year, month, days };
  }
}
