import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseService } from './expense.service';

function parseOptionalYearMonth(
  yearRaw?: string,
  monthRaw?: string,
): { year?: number; month?: number } {
  if (yearRaw === undefined && monthRaw === undefined) {
    return {};
  }
  if (yearRaw === undefined || monthRaw === undefined) {
    throw new BadRequestException(
      'year and month must both be provided to filter by period',
    );
  }
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  if (year < 2000 || year > 2100) {
    throw new BadRequestException('year must be between 2000 and 2100');
  }
  if (month < 1 || month > 12) {
    throw new BadRequestException('month must be between 1 and 12');
  }
  return { year, month };
}

@ApiTags('expenses')
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chi phí' })
  @ApiQuery({
    name: 'year',
    required: false,
    example: 2026,
    description: 'Lọc theo expenseDate (UTC); cần kèm month',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    example: 4,
    description: 'Tháng 1–12 (UTC); cần kèm year',
  })
  @ApiOkResponse()
  findAll(
    @Query('year') yearRaw?: string,
    @Query('month') monthRaw?: string,
  ) {
    const { year, month } = parseOptionalYearMonth(yearRaw, monthRaw);
    if (year !== undefined && month !== undefined) {
      return this.expenseService.findAll({ year, month });
    }
    return this.expenseService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết chi phí' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.expenseService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo chi phí' })
  @ApiCreatedResponse()
  create(@Body() dto: CreateExpenseDto) {
    return this.expenseService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật chi phí' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expenseService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa chi phí' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  remove(@Param('id') id: string) {
    return this.expenseService.remove(id);
  }
}
