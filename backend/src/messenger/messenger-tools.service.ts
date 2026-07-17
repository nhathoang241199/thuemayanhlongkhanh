import { Injectable } from '@nestjs/common';
import type { Tool } from '@anthropic-ai/sdk/resources/messages/messages.mjs';
import {
  dayCountInclusive,
  discountedRentalVnd,
  multiDayRentalMultiplier,
  rentalAmountWithOptionsVnd,
} from '../common/booking-schedule';
import { AvailabilityService } from '../availability/availability.service';
import { BookingTermsService } from '../booking-terms/booking-terms.service';
import { CameraService } from '../camera/camera.service';
import { LensService } from '../lens/lens.service';
import { ShopClosureService } from '../shop-closure/shop-closure.service';
import {
  formatCameraList,
  formatLensList,
  formatVndShort,
  parseBrand,
  parseSlot,
} from './messenger-formatters';

@Injectable()
export class MessengerToolsService {
  constructor(
    private readonly cameras: CameraService,
    private readonly lenses: LensService,
    private readonly availability: AvailabilityService,
    private readonly bookingTerms: BookingTermsService,
    private readonly shopClosure: ShopClosureService,
  ) {}

  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'list_cameras',
        description: 'Danh sách máy ảnh đang cho thuê, kèm giá ngày/buổi. Có thể lọc theo hãng.',
        input_schema: {
          type: 'object',
          properties: {
            brand: {
              type: 'string',
              description: 'Hãng: FUJIFILM, CANON, hoặc DJI. Bỏ trống = tất cả.',
            },
          },
        },
      },
      {
        name: 'get_camera',
        description: 'Chi tiết một máy theo id.',
        input_schema: {
          type: 'object',
          properties: {
            cameraId: { type: 'string' },
          },
          required: ['cameraId'],
        },
      },
      {
        name: 'list_lenses',
        description: 'Lens tương thích với một máy (cần cameraId).',
        input_schema: {
          type: 'object',
          properties: {
            cameraId: { type: 'string' },
          },
          required: ['cameraId'],
        },
      },
      {
        name: 'get_booking_terms',
        description: 'Điều khoản đặt lịch, quy định cọc của shop.',
        input_schema: { type: 'object', properties: {} },
      },
      {
        name: 'check_availability',
        description: 'Kiểm tra máy còn trống trong khoảng ngày + buổi.',
        input_schema: {
          type: 'object',
          properties: {
            cameraId: { type: 'string' },
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'YYYY-MM-DD' },
            slot: {
              type: 'string',
              description: 'FULL_DAY, MORNING, AFTERNOON, hoặc EVENING. Mặc định FULL_DAY.',
            },
          },
          required: ['cameraId', 'startDate', 'endDate'],
        },
      },
      {
        name: 'list_available_cameras',
        description: 'Máy còn trống theo khoảng ngày + buổi, có thể lọc hãng.',
        input_schema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'YYYY-MM-DD' },
            slot: { type: 'string' },
            brand: { type: 'string' },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'closed_days',
        description: 'Ngày shop nghỉ trong một tháng.',
        input_schema: {
          type: 'object',
          properties: {
            year: { type: 'number' },
            month: { type: 'number', description: '1-12' },
          },
          required: ['year', 'month'],
        },
      },
      {
        name: 'quote_rental',
        description:
          'Báo giá thuê theo số ngày (hệ số shop: 2 ngày=1.75x, 3=2.4x, 4=3x, 5=3.5x). Bắt buộc dùng khi khách hỏi tổng tiền nhiều ngày.',
        input_schema: {
          type: 'object',
          properties: {
            cameraId: { type: 'string' },
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'YYYY-MM-DD' },
            slot: {
              type: 'string',
              description: 'FULL_DAY, MORNING, AFTERNOON, hoặc EVENING. Mặc định FULL_DAY.',
            },
            lensId: {
              type: 'string',
              description: 'Lens kèm theo (tùy chọn).',
            },
          },
          required: ['cameraId', 'startDate', 'endDate'],
        },
      },
    ];
  }

  async executeTool(name: string, input: Record<string, unknown>): Promise<string> {
    try {
      switch (name) {
        case 'list_cameras': {
          const brand = parseBrand(input.brand as string | undefined);
          const rows = await this.cameras.findPublic(brand);
          return formatCameraList(rows);
        }
        case 'get_camera': {
          const camera = await this.cameras.findPublicOne(String(input.cameraId));
          return formatCameraList([camera]);
        }
        case 'list_lenses': {
          const rows = await this.lenses.findPublic(String(input.cameraId));
          return formatLensList(rows);
        }
        case 'get_booking_terms': {
          const terms = await this.bookingTerms.getPublic();
          return terms.content?.trim() || 'Chưa có điều khoản — nhờ admin xác nhận.';
        }
        case 'check_availability': {
          const result = await this.availability.isRangeAvailable(
            String(input.cameraId),
            String(input.startDate),
            String(input.endDate),
            parseSlot(input.slot as string | undefined),
          );
          const status = result.available ? 'CÒN TRỐNG' : 'KHÔNG CÒN TRỐNG';
          const days = result.days
            .map((d) => `${d.date}: ${d.available ? 'ok' : 'full'}`)
            .join(', ');
          return `${status}. Chi tiết từng ngày: ${days}`;
        }
        case 'list_available_cameras': {
          const rows = await this.availability.camerasForSlot(
            parseBrand(input.brand as string | undefined),
            String(input.startDate),
            String(input.endDate),
            parseSlot(input.slot as string | undefined),
          );
          return formatCameraList(rows);
        }
        case 'closed_days': {
          const result = await this.shopClosure.closedMonth(
            Number(input.year),
            Number(input.month),
          );
          const closedDates = result.days.filter((d) => d.closed).map((d) => d.date);
          if (!closedDates.length) return 'Shop không nghỉ ngày nào trong tháng này.';
          return closedDates.join(', ');
        }
        case 'quote_rental': {
          return this.quoteRental(input);
        }
        default:
          return `Tool không hỗ trợ: ${name}`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Lỗi khi gọi ${name}: ${msg}. Nhờ admin xác nhận.`;
    }
  }

  private async quoteRental(input: Record<string, unknown>): Promise<string> {
    const cameraId = String(input.cameraId);
    const startDate = String(input.startDate);
    const endDate = String(input.endDate);
    const slot = parseSlot(input.slot as string | undefined);

    const camera = await this.cameras.findPublicOne(cameraId);
    const dayCount = dayCountInclusive(startDate, endDate);
    const multiplier = multiDayRentalMultiplier(dayCount);
    const cameraRental = rentalAmountWithOptionsVnd(
      dayCount,
      camera.dayPrice,
      camera.shiftPrice,
      slot,
    );
    const cameraTotal = discountedRentalVnd(
      cameraRental,
      camera.discountPercent ?? 0,
    );

    let lensLine = '';
    let grandTotal = cameraTotal;

    if (input.lensId) {
      const lenses = await this.lenses.findPublic(cameraId);
      const lens = lenses.find((l) => l.id === String(input.lensId));
      if (lens) {
        const lensRental = rentalAmountWithOptionsVnd(
          dayCount,
          lens.dayPrice,
          lens.shiftPrice,
          slot,
        );
        const lensTotal = discountedRentalVnd(
          lensRental,
          lens.discountPercent ?? 0,
        );
        grandTotal += lensTotal;
        lensLine = `, lens ${lens.name} ${formatVndShort(lensTotal)}`;
      }
    }

    const range =
      dayCount <= 1 ? startDate : `${startDate}–${endDate} (${dayCount} ngày)`;
    const discountNote = camera.discountPercent
      ? `, giảm ${camera.discountPercent}%`
      : '';

    return (
      `${camera.brand} ${camera.name}: ${formatVndShort(cameraTotal)}` +
      `${lensLine}. Tổng: ${formatVndShort(grandTotal)}. ` +
      `(giá ngày ${formatVndShort(camera.dayPrice)}, hệ số ${multiplier}${discountNote}, ${range})`
    );
  }
}
