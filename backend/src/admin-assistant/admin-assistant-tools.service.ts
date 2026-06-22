import { Injectable } from '@nestjs/common';
import type { Tool } from '@anthropic-ai/sdk/resources/messages/messages.mjs';
import {
  BookingStatus,
  CustomerTag,
} from '../../generated/prisma/enums';
import { monthRangeUtc } from '../common/month-range-utc';
import { AvailabilityService } from '../availability/availability.service';
import { CameraService } from '../camera/camera.service';
import { CustomerService } from '../customer/customer.service';
import { LensService } from '../lens/lens.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShopClosureService } from '../shop-closure/shop-closure.service';
import { StatsService } from '../stats/stats.service';
import {
  formatCameraInventoryList,
  formatLensInventoryList,
  formatVnd,
  parseBrand,
  parseSlot,
  parseYearMonth,
} from './admin-assistant-formatters';

const BOOKING_STATUS_VALUES = Object.values(BookingStatus);
const CUSTOMER_TAG_VALUES = Object.values(CustomerTag);

@Injectable()
export class AdminAssistantToolsService {
  constructor(
    private readonly stats: StatsService,
    private readonly prisma: PrismaService,
    private readonly customers: CustomerService,
    private readonly cameras: CameraService,
    private readonly lenses: LensService,
    private readonly availability: AvailabilityService,
    private readonly shopClosure: ShopClosureService,
  ) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_monthly_summary',
        description:
          'Tổng hợp một tháng: doanh thu (PAID), chi phí, lợi nhuận, số đơn đã thanh toán.',
        input_schema: {
          type: 'object',
          properties: {
            year: { type: 'number', description: 'Năm, vd. 2026' },
            month: { type: 'number', description: 'Tháng 1-12' },
          },
          required: ['year', 'month'],
        },
      },
      {
        name: 'get_revenue_by_month',
        description: 'Doanh thu và số đơn PAID theo từng tháng trong một năm.',
        input_schema: {
          type: 'object',
          properties: {
            year: { type: 'number' },
          },
          required: ['year'],
        },
      },
      {
        name: 'get_equipment_stats',
        description:
          'Tổng số máy/lens trong kho và giá trị tồn kho (purchasePrice × quantity).',
        input_schema: { type: 'object', properties: {} },
      },
      {
        name: 'query_bookings',
        description:
          'Đếm và liệt kê đơn thuê theo trạng thái và tháng. CANCELLED lọc theo updatedAt trong tháng; các status khác theo startBookingDate.',
        input_schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: `BookingStatus: ${BOOKING_STATUS_VALUES.join(', ')}`,
            },
            year: { type: 'number' },
            month: { type: 'number', description: '1-12' },
            limit: {
              type: 'number',
              description: 'Số đơn liệt kê tối đa (mặc định 5, tối đa 20)',
            },
          },
          required: ['year', 'month'],
        },
      },
      {
        name: 'get_expense_summary',
        description: 'Tổng chi phí, số khoản chi và top khoản lớn trong tháng.',
        input_schema: {
          type: 'object',
          properties: {
            year: { type: 'number' },
            month: { type: 'number' },
          },
          required: ['year', 'month'],
        },
      },
      {
        name: 'get_customer_stats',
        description:
          'Thống kê khách hàng: tổng số, theo tag (NORMAL, VIP, …), số đã xác minh CCCD.',
        input_schema: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: `Lọc theo CustomerTag: ${CUSTOMER_TAG_VALUES.join(', ')}. Bỏ trống = tất cả.`,
            },
          },
        },
      },
      {
        name: 'get_top_customers_by_revenue',
        description:
          'Xếp hạng khách hàng theo tổng tiền thuê đã thanh toán (PAID) trong tháng — ai thuê nhiều tiền nhất.',
        input_schema: {
          type: 'object',
          properties: {
            year: { type: 'number' },
            month: { type: 'number', description: '1-12' },
            limit: {
              type: 'number',
              description: 'Số khách trả về (mặc định 5, tối đa 20)',
            },
          },
          required: ['year', 'month'],
        },
      },
      {
        name: 'lookup_customer',
        description:
          'Tra cứu khách hàng theo tên hoặc số điện thoại (tìm gần đúng). Trả về tên, SĐT, tag, trạng thái xác minh.',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Tên khách hoặc SĐT (một phần cũng được)',
            },
            searchField: {
              type: 'string',
              description: 'name hoặc phone. Bỏ trống = tự nhận diện.',
            },
            limit: {
              type: 'number',
              description: 'Số kết quả tối đa (mặc định 5, tối đa 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_cameras',
        description: 'Danh sách máy ảnh trong kho: tên, số lượng, giá thuê.',
        input_schema: {
          type: 'object',
          properties: {
            brand: {
              type: 'string',
              description: 'FUJIFILM, CANON, hoặc DJI. Bỏ trống = tất cả.',
            },
          },
        },
      },
      {
        name: 'list_lenses',
        description:
          'Danh sách lens. Có thể lọc lens tương thích một máy qua cameraId.',
        input_schema: {
          type: 'object',
          properties: {
            cameraId: { type: 'string' },
          },
        },
      },
      {
        name: 'get_closed_days',
        description: 'Ngày shop nghỉ trong một tháng.',
        input_schema: {
          type: 'object',
          properties: {
            year: { type: 'number' },
            month: { type: 'number' },
          },
          required: ['year', 'month'],
        },
      },
      {
        name: 'check_availability',
        description:
          'Máy còn trống theo khoảng ngày nhận–trả và buổi thuê.',
        input_schema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'YYYY-MM-DD' },
            slot: {
              type: 'string',
              description: 'FULL_DAY, MORNING, AFTERNOON, EVENING',
            },
            brand: { type: 'string' },
          },
          required: ['startDate', 'endDate'],
        },
      },
    ];
  }

  async executeTool(
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> {
    try {
      switch (name) {
        case 'get_monthly_summary':
          return this.getMonthlySummary(input);
        case 'get_revenue_by_month':
          return this.getRevenueByMonth(input);
        case 'get_equipment_stats':
          return this.getEquipmentStats();
        case 'query_bookings':
          return this.queryBookings(input);
        case 'get_expense_summary':
          return this.getExpenseSummary(input);
        case 'get_customer_stats':
          return this.getCustomerStats(input);
        case 'get_top_customers_by_revenue':
          return this.getTopCustomersByRevenue(input);
        case 'lookup_customer':
          return this.lookupCustomer(input);
        case 'list_cameras':
          return this.listCameras(input);
        case 'list_lenses':
          return this.listLenses(input);
        case 'get_closed_days':
          return this.getClosedDays(input);
        case 'check_availability':
          return this.checkAvailability(input);
        default:
          return `Tool không hỗ trợ: ${name}`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Lỗi ${name}: ${msg}`;
    }
  }

  private async getMonthlySummary(input: Record<string, unknown>): Promise<string> {
    const ym = parseYearMonth(input.year, input.month);
    if (!ym) return 'year và month không hợp lệ (month 1-12).';
    const s = await this.stats.monthlySummary(ym.year, ym.month);
    return [
      `Tháng ${ym.month}/${ym.year}:`,
      `- Doanh thu (PAID): ${formatVnd(s.revenue)} (${s.bookingCount} đơn)`,
      `- Chi phí: ${formatVnd(s.expenses)} (${s.expenseCount} khoản)`,
      `- Lợi nhuận: ${formatVnd(s.profit)}`,
    ].join('\n');
  }

  private async getRevenueByMonth(input: Record<string, unknown>): Promise<string> {
    const year = Number(input.year);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return 'year không hợp lệ.';
    }
    const data = await this.stats.revenueByMonth(year);
    const lines = data.months
      .filter((m) => m.revenue > 0 || m.bookingCount > 0)
      .map(
        (m) =>
          `${m.month}: ${formatVnd(m.revenue)} (${m.bookingCount} đơn)`,
      );
    if (lines.length === 0) return `Năm ${year} chưa có doanh thu PAID.`;
    return `Doanh thu PAID năm ${year}:\n${lines.join('\n')}`;
  }

  private async getEquipmentStats(): Promise<string> {
    const e = await this.stats.equipmentValue();
    return [
      'Tồn kho thiết bị:',
      `- Máy ảnh: ${e.cameraUnitCount} máy, giá trị ${formatVnd(e.totalCameraValue)}`,
      `- Lens: ${e.lensUnitCount} ống, giá trị ${formatVnd(e.totalLensValue)}`,
      `- Tổng: ${e.cameraUnitCount + e.lensUnitCount} thiết bị, ${formatVnd(e.totalEquipmentValue)}`,
    ].join('\n');
  }

  private async queryBookings(input: Record<string, unknown>): Promise<string> {
    const ym = parseYearMonth(input.year, input.month);
    if (!ym) return 'year và month không hợp lệ.';
    const { start, end } = monthRangeUtc(ym.year, ym.month);

    const statusRaw = input.status as string | undefined;
    const status =
      statusRaw && BOOKING_STATUS_VALUES.includes(statusRaw as BookingStatus)
        ? (statusRaw as BookingStatus)
        : undefined;

    const limit = Math.min(
      20,
      Math.max(0, Number(input.limit) || 5),
    );

    const dateField =
      status === BookingStatus.CANCELLED ? 'updatedAt' : 'startBookingDate';

    const where = {
      ...(status ? { status } : {}),
      [dateField]: { gte: start, lt: end },
    };

    const [count, rows] = await Promise.all([
      this.prisma.booking.count({ where }),
      limit > 0
        ? this.prisma.booking.findMany({
            where,
            orderBy: { [dateField]: 'desc' },
            take: limit,
            select: {
              bookingCode: true,
              status: true,
              amount: true,
              startBookingDate: true,
              customer: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const statusLabel = status ?? 'mọi trạng thái';
    const fieldNote =
      status === BookingStatus.CANCELLED
        ? ' (lọc theo ngày hủy/updatedAt)'
        : ' (lọc theo ngày thuê/startBookingDate)';

    const lines = [
      `Tháng ${ym.month}/${ym.year}, ${statusLabel}: ${count} đơn${fieldNote}.`,
    ];

    if (rows.length > 0) {
      lines.push('Mẫu đơn gần nhất:');
      for (const b of rows) {
        lines.push(
          `- ${b.bookingCode} | ${b.status} | ${b.customer.name} | ${formatVnd(b.amount)}`,
        );
      }
    }

    return lines.join('\n');
  }

  private async getExpenseSummary(input: Record<string, unknown>): Promise<string> {
    const ym = parseYearMonth(input.year, input.month);
    if (!ym) return 'year và month không hợp lệ.';
    const { start, end } = monthRangeUtc(ym.year, ym.month);

    const rows = await this.prisma.expense.findMany({
      where: { expenseDate: { gte: start, lt: end } },
      orderBy: { amount: 'desc' },
    });

    const total = rows.reduce((s, r) => s + r.amount, 0);
    const top = rows.slice(0, 5);

    const lines = [
      `Chi phí tháng ${ym.month}/${ym.year}: ${formatVnd(total)} (${rows.length} khoản).`,
    ];
    if (top.length > 0) {
      lines.push('Top khoản chi:');
      for (const e of top) {
        lines.push(`- ${e.title}: ${formatVnd(e.amount)}`);
      }
    }
    return lines.join('\n');
  }

  private async getCustomerStats(input: Record<string, unknown>): Promise<string> {
    const tagRaw = input.tag as string | undefined;
    const tag =
      tagRaw && CUSTOMER_TAG_VALUES.includes(tagRaw as CustomerTag)
        ? (tagRaw as CustomerTag)
        : undefined;

    const [total, verified, byTag] = await Promise.all([
      this.prisma.customer.count(
        tag ? { where: { customerTag: tag } } : undefined,
      ),
      this.prisma.customer.count({ where: { isVerified: true } }),
      this.prisma.customer.groupBy({
        by: ['customerTag'],
        _count: true,
      }),
    ]);

    const tagLines = byTag
      .map((g) => `${g.customerTag}: ${g._count}`)
      .join(', ');

    if (tag) {
      return `Khách tag ${tag}: ${total}. (Toàn shop: ${tagLines}; đã xác minh CCCD: ${verified})`;
    }

    return `Tổng khách: ${total}. Theo tag: ${tagLines}. Đã xác minh CCCD: ${verified}.`;
  }

  private async getTopCustomersByRevenue(
    input: Record<string, unknown>,
  ): Promise<string> {
    const ym = parseYearMonth(input.year, input.month);
    if (!ym) return 'year và month không hợp lệ.';
    const limit = Math.min(20, Math.max(1, Number(input.limit) || 5));

    const rows = await this.stats.topCustomersByRevenue(
      ym.year,
      ym.month,
      limit,
    );

    if (rows.length === 0) {
      return `Tháng ${ym.month}/${ym.year}: chưa có đơn PAID nào.`;
    }

    const lines = [
      `Top khách theo doanh thu PAID tháng ${ym.month}/${ym.year} (theo ngày thuê):`,
    ];
    rows.forEach((r, i) => {
      lines.push(
        `${i + 1}. ${r.name} (${r.customerTag}) — ${formatVnd(r.totalRevenue)} (${r.bookingCount} đơn)`,
      );
    });
    return lines.join('\n');
  }

  private async lookupCustomer(input: Record<string, unknown>): Promise<string> {
    const query = String(input.query ?? '').trim();
    if (!query) return 'Cần query (tên hoặc SĐT khách).';

    const fieldRaw = String(input.searchField ?? '').trim();
    const limit = Math.min(10, Math.max(1, Number(input.limit) || 5));
    const digitsOnly = query.replace(/\D/g, '');
    const searchField: 'name' | 'phone' =
      fieldRaw === 'phone' || fieldRaw === 'name'
        ? fieldRaw
        : digitsOnly.length >= 9
          ? 'phone'
          : 'name';

    const { items, total } = await this.customers.findPage(1, limit, {
      searchField,
      search: searchField === 'phone' ? digitsOnly || query : query,
    });

    if (items.length === 0) {
      return `Không tìm thấy khách với ${searchField === 'phone' ? 'SĐT' : 'tên'} "${query}".`;
    }

    const lines = [
      `Tìm thấy ${total} khách (hiển thị ${items.length}):`,
    ];
    for (const c of items) {
      const parts = [
        `- ${c.name}`,
        `SĐT: ${c.phone}`,
        `tag: ${c.customerTag}`,
        c.isVerified ? 'đã xác minh' : 'chưa xác minh',
      ];
      if (c.facebookUrl?.trim()) parts.push(`FB: ${c.facebookUrl.trim()}`);
      if (c.note?.trim()) parts.push(`ghi chú: ${c.note.trim()}`);
      lines.push(parts.join(' | '));
    }
    if (total > items.length) {
      lines.push(
        `(Còn ${total - items.length} khách khác — gõ thêm ký tự để thu hẹp.)`,
      );
    }
    return lines.join('\n');
  }

  private async listCameras(input: Record<string, unknown>): Promise<string> {
    const brand = parseBrand(input.brand as string | undefined);
    const rows = brand
      ? await this.cameras.findPublic(brand)
      : await this.cameras.findAll();
    return formatCameraInventoryList(
      rows.map((c) => ({
        brand: String(c.brand),
        name: c.name,
        quantity: c.quantity,
        dayPrice: c.dayPrice,
        shiftPrice: c.shiftPrice,
        discountPercent: c.discountPercent,
      })),
    );
  }

  private async listLenses(input: Record<string, unknown>): Promise<string> {
    const cameraId = input.cameraId as string | undefined;
    if (cameraId?.trim()) {
      const rows = await this.lenses.findPublic(cameraId.trim());
      return formatLensInventoryList(rows);
    }
    const rows = await this.lenses.findAll();
    return formatLensInventoryList(
      rows.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        dayPrice: l.dayPrice,
        shiftPrice: l.shiftPrice,
        discountPercent: l.discountPercent,
      })),
    );
  }

  private async getClosedDays(input: Record<string, unknown>): Promise<string> {
    const ym = parseYearMonth(input.year, input.month);
    if (!ym) return 'year và month không hợp lệ.';
    const result = await this.shopClosure.closedMonth(ym.year, ym.month);
    const closed = result.days.filter((d) => d.closed).map((d) => d.date);
    if (closed.length === 0) {
      return `Tháng ${ym.month}/${ym.year}: shop không nghỉ ngày nào.`;
    }
    return `Tháng ${ym.month}/${ym.year} shop nghỉ ${closed.length} ngày: ${closed.join(', ')}`;
  }

  private async checkAvailability(
    input: Record<string, unknown>,
  ): Promise<string> {
    const startDate = String(input.startDate ?? '').trim();
    const endDate = String(input.endDate ?? '').trim();
    if (!startDate || !endDate) return 'Cần startDate và endDate (YYYY-MM-DD).';

    const rows = await this.availability.camerasForSlot(
      parseBrand(input.brand as string | undefined),
      startDate,
      endDate,
      parseSlot(input.slot as string | undefined),
    );

    const available = rows.filter((r) => r.available);
    const header = `Từ ${startDate} đến ${endDate}: ${available.length}/${rows.length} model còn trống.`;
    if (available.length === 0) return `${header}\nKhông có máy trống.`;
    return `${header}\n${formatCameraInventoryList(available)}`;
  }
}
