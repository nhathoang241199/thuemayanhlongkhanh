import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { monthRangeUtc } from '../common/month-range-utc';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

export type FindAllExpensesQuery = {
  year?: number;
  month?: number;
};

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query?: FindAllExpensesQuery) {
    const where: Prisma.ExpenseWhereInput = {};

    if (query?.year !== undefined && query?.month !== undefined) {
      const { start, end } = monthRangeUtc(query.year, query.month);
      where.expenseDate = { gte: start, lt: end };
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.expense.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Expense ${id} not found`);
    }
    return row;
  }

  create(dto: CreateExpenseDto) {
    const { expenseDate, ...rest } = dto;
    return this.prisma.expense.create({
      data: {
        ...rest,
        expenseDate: new Date(expenseDate),
      },
    });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const { expenseDate, ...rest } = dto;
    const data: Prisma.ExpenseUpdateInput = {
      ...rest,
      ...(expenseDate !== undefined
        ? { expenseDate: new Date(expenseDate) }
        : {}),
    };
    try {
      return await this.prisma.expense.update({
        where: { id },
        data,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`Expense ${id} not found`);
      }
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.expense.delete({ where: { id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`Expense ${id} not found`);
      }
      throw e;
    }
  }
}
