import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingSlot,
  BookingStatus,
  CustomerTag,
  PaymentRecordStatus,
  PaymentStatus,
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { AvailabilityService } from '../availability/availability.service';
import {
  assertPickupAtValid,
  bookingAmountVnd,
  dayCountInclusive,
  deliveryFeeVnd,
  rentalAmountVnd,
  slotWindow,
} from '../common/booking-schedule';
import {
  BOOKING_CANCEL_REFUND_VND,
  BOOKING_DEPOSIT_VND,
  balanceDueVnd,
  isCancelRefundEligible,
} from '../common/booking-payment';
import { normalizePhone } from '../common/normalize-phone';
import { PrismaService } from '../prisma/prisma.service';
import {
  parsePendingChange,
  type PendingChangePayload,
} from './booking-pending-change';
import { CancelCustomerBookingDto } from './dto/cancel-customer-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateCustomerBookingDto } from './dto/create-customer-booking.dto';
import { RequestChangeCustomerBookingDto } from './dto/request-change-customer-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdatePendingCustomerBookingDto } from './dto/update-pending-customer-booking.dto';

const bookingInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
      verificationImageUrls: true,
    },
  },
  camera: { select: { id: true, name: true, brand: true } },
} as const;

/** Đơn đã kết thúc — không hiển thị trong danh sách khách (GET /bookings/mine). */
const CUSTOMER_LIST_HIDDEN_STATUSES: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
];

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
  ) {}

  private async generateBookingCode(): Promise<string> {
    const now = new Date();
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const y = vn.getUTCFullYear();
    const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
    const d = String(vn.getUTCDate()).padStart(2, '0');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `DH-${y}${m}${d}-${suffix}`;
  }

  async findAll() {
    return this.prisma.booking.findMany({
      orderBy: { startBookingDate: 'desc' },
      include: bookingInclude,
    });
  }

  async findByCustomerPhone(phone: string) {
    const normalized = normalizePhone(phone);
    if (normalized.length < 9) {
      return [];
    }
    const customer = await this.prisma.customer.findUnique({
      where: { phone: normalized },
    });
    if (!customer) {
      return [];
    }
    const rows = await this.prisma.booking.findMany({
      where: {
        customerId: customer.id,
        status: { notIn: CUSTOMER_LIST_HIDDEN_STATUSES },
      },
      orderBy: { startBookingDate: 'desc' },
      include: bookingInclude,
    });

    const cameraIds = [...new Set(rows.map((r) => r.camera.id))];
    const readyMap =
      await this.availability.getPhysicalAvailabilityByCameraIds(cameraIds);

    return rows.map((row) => ({
      ...row,
      cameraReady:
        row.status === BookingStatus.CONFIRMED
          ? (readyMap.get(row.camera.id) ?? false)
          : null,
    }));
  }

  async findOne(id: string) {
    const row = await this.prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });
    if (!row) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return row;
  }

  private formatCancelRefundNote(
    bankAccountInfo: string,
    existingNote: string | null,
  ): string {
    const vnd = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    });
    const at = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
    const block = [
      `--- Yêu cầu hủy · hoàn cọc (${vnd.format(BOOKING_CANCEL_REFUND_VND)}) ---`,
      `Thời gian: ${at}`,
      'TK nhận hoàn:',
      bankAccountInfo.trim(),
    ].join('\n');
    if (existingNote?.trim()) {
      return `${existingNote.trim()}\n\n${block}`;
    }
    return block;
  }

  private formatCancelNoRefundNote(existingNote: string | null): string {
    const at = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
    const block = [
      '--- Hủy đặt lịch (không hoàn cọc — trong vòng 24h trước lấy máy) ---',
      `Thời gian: ${at}`,
    ].join('\n');
    if (existingNote?.trim()) {
      return `${existingNote.trim()}\n\n${block}`;
    }
    return block;
  }

  private resolvePickupAt(
    startDate: string,
    slot: BookingSlot,
    pickupAtIso: string,
  ): Date {
    const pickupAt = new Date(pickupAtIso);
    try {
      assertPickupAtValid(startDate, slot, pickupAt);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Thời gian nhận máy không hợp lệ',
      );
    }
    return pickupAt;
  }

  private assertCustomerCanModifyDepositedBooking(booking: {
    status: BookingStatus;
    paymentStatus: PaymentStatus;
  }) {
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Chỉ thao tác được khi đơn đang chờ lấy máy',
      );
    }
    if (booking.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException(
        'Đơn đã thanh toán đủ — không thể hủy hoặc đổi lịch',
      );
    }
    if (booking.paymentStatus !== PaymentStatus.DEPOSITED) {
      throw new BadRequestException('Đơn chưa hoàn tất cọc giữ lịch');
    }
  }

  async applyPendingChangeToBooking(bookingId: string): Promise<boolean> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) return false;

    const pending = parsePendingChange(booking.pendingChange);
    if (!pending) return false;

    const { available } = await this.availability.isRangeAvailable(
      pending.cameraId,
      pending.startDate,
      pending.endDate,
      pending.slot,
      booking.id,
    );
    if (!available) return false;

    const { startBookingDate } = slotWindow(pending.startDate, pending.slot);
    const { endBookingDate } = slotWindow(pending.endDate, pending.slot);

    const pricing = await this.computeBookingPricing(
      pending.cameraId,
      pending.startDate,
      pending.endDate,
      pending.slot,
      pending.shippingAddress ?? booking.shippingAddress,
    );

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        cameraId: pending.cameraId,
        startBookingDate,
        endBookingDate,
        slot: pending.slot,
        amount: pricing.amount,
        discountPercent: pricing.discountPercent,
        note: pending.note ?? booking.note,
        shippingAddress: pending.shippingAddress ?? booking.shippingAddress,
        pendingChange: Prisma.DbNull,
      },
    });
    return true;
  }

  async cancelCustomerBooking(id: string, dto: CancelCustomerBookingDto) {
    const phone = normalizePhone(dto.phone);
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { customer: { select: { phone: true } } },
    });
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn');
    }
    if (normalizePhone(booking.customer.phone) !== phone) {
      throw new ForbiddenException('Không có quyền hủy đơn này');
    }

    if (booking.status === BookingStatus.PENDING_PAYMENT) {
      const updated = await this.prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          pendingChange: Prisma.DbNull,
          note: this.formatCancelNoRefundNote(booking.note),
        },
        include: bookingInclude,
      });
      return {
        booking: updated,
        refundEligible: false,
        refundAmount: 0,
      };
    }

    this.assertCustomerCanModifyDepositedBooking(booking);

    const refundEligible = isCancelRefundEligible(booking.startBookingDate);

    if (refundEligible) {
      const bank = dto.bankAccountInfo?.trim();
      if (!bank) {
        throw new BadRequestException(
          'Vui lòng nhập tài khoản ngân hàng để nhận hoàn cọc',
        );
      }
      const updated = await this.prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.PENDING_REFUND_CANCEL,
          pendingChange: Prisma.DbNull,
          note: this.formatCancelRefundNote(bank, booking.note),
        },
        include: bookingInclude,
      });
      return {
        booking: updated,
        refundEligible: true,
        refundAmount: BOOKING_CANCEL_REFUND_VND,
      };
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        pendingChange: Prisma.DbNull,
        note: this.formatCancelNoRefundNote(booking.note),
      },
      include: bookingInclude,
    });
    return {
      booking: updated,
      refundEligible: false,
      refundAmount: 0,
    };
  }

  private async computeBookingPricing(
    cameraId: string,
    startDate: string,
    endDate: string,
    slot: BookingSlot,
    shippingAddress?: string | null,
  ): Promise<{ amount: number; discountPercent: number }> {
    const camera = await this.prisma.camera.findUnique({
      where: { id: cameraId },
    });
    if (!camera) {
      throw new NotFoundException('Máy ảnh không tồn tại');
    }
    const discountPercent = camera.discountPercent ?? 0;
    const dayCount = dayCountInclusive(startDate, endDate);
    const rental = rentalAmountVnd(
      dayCount,
      camera.dayPrice,
      camera.shiftPrice,
      slot,
    );
    return {
      amount: bookingAmountVnd(
        rental,
        discountPercent,
        deliveryFeeVnd(shippingAddress),
      ),
      discountPercent,
    };
  }

  private async cameraDiscountPercent(cameraId: string): Promise<number> {
    const camera = await this.prisma.camera.findUnique({
      where: { id: cameraId },
      select: { discountPercent: true },
    });
    if (!camera) {
      throw new NotFoundException('Máy ảnh không tồn tại');
    }
    return camera.discountPercent ?? 0;
  }

  private assertDeliveryAllowed(
    customer: { isVerified: boolean },
    shippingAddress?: string | null,
  ) {
    if (!shippingAddress?.trim()) return;
    if (!customer.isVerified) {
      throw new BadRequestException(
        'Chỉ tài khoản đã xác minh mới được chọn giao máy tận nơi',
      );
    }
  }

  async requestChangeCustomerBooking(
    id: string,
    dto: RequestChangeCustomerBookingDto,
  ) {
    const phone = normalizePhone(dto.phone);
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: { select: { phone: true, isVerified: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn');
    }
    if (normalizePhone(booking.customer.phone) !== phone) {
      throw new ForbiddenException('Không có quyền thay đổi đơn này');
    }
    this.assertCustomerCanModifyDepositedBooking(booking);

    this.availability.validateDateRange(dto.startDate, dto.endDate);
    this.availability.validateSlotForRange(
      dto.startDate,
      dto.endDate,
      dto.slot,
    );

    const { available } = await this.availability.isRangeAvailable(
      dto.cameraId,
      dto.startDate,
      dto.endDate,
      dto.slot,
      booking.id,
    );
    if (!available) {
      throw new BadRequestException(
        'Không còn chỗ trong một hoặc nhiều ngày đã chọn',
      );
    }

    this.assertDeliveryAllowed(booking.customer, dto.shippingAddress);

    const pricing = await this.computeBookingPricing(
      dto.cameraId,
      dto.startDate,
      dto.endDate,
      dto.slot,
      dto.shippingAddress,
    );

    const { startBookingDate } = slotWindow(dto.startDate, dto.slot);
    const { endBookingDate } = slotWindow(dto.endDate, dto.slot);
    const pickupAt = this.resolvePickupAt(dto.startDate, dto.slot, dto.pickupAt);

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        cameraId: dto.cameraId,
        startBookingDate,
        endBookingDate,
        slot: dto.slot,
        pickupAt,
        amount: pricing.amount,
        discountPercent: pricing.discountPercent,
        note: dto.note?.trim()
          ? booking.note?.trim()
            ? `${booking.note.trim()}\n${dto.note.trim()}`
            : dto.note.trim()
          : booking.note,
        shippingAddress: dto.shippingAddress ?? booking.shippingAddress,
        pendingChange: Prisma.DbNull,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.DEPOSITED,
      },
      include: bookingInclude,
    });

    return {
      booking: updated,
      newAmount: pricing.amount,
      balanceDue: balanceDueVnd(pricing.amount),
    };
  }

  async updatePendingCustomerBooking(
    id: string,
    dto: UpdatePendingCustomerBookingDto,
  ) {
    const phone = normalizePhone(dto.phone);
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: { select: { phone: true, isVerified: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn');
    }
    if (normalizePhone(booking.customer.phone) !== phone) {
      throw new ForbiddenException('Không có quyền sửa đơn này');
    }
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Chỉ sửa được đơn đang chờ cọc');
    }
    if (booking.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException('Đơn đã có cọc, không sửa được theo luồng này');
    }

    this.availability.validateDateRange(dto.startDate, dto.endDate);
    this.availability.validateSlotForRange(
      dto.startDate,
      dto.endDate,
      dto.slot,
    );

    const { available } = await this.availability.isRangeAvailable(
      dto.cameraId,
      dto.startDate,
      dto.endDate,
      dto.slot,
      booking.id,
    );
    if (!available) {
      throw new BadRequestException(
        'Không còn chỗ trong một hoặc nhiều ngày đã chọn',
      );
    }

    const shippingAddress =
      dto.shippingAddress === undefined
        ? booking.shippingAddress
        : dto.shippingAddress?.trim() || null;

    this.assertDeliveryAllowed(booking.customer, shippingAddress);

    const pricing = await this.computeBookingPricing(
      dto.cameraId,
      dto.startDate,
      dto.endDate,
      dto.slot,
      shippingAddress,
    );

    const { startBookingDate } = slotWindow(dto.startDate, dto.slot);
    const { endBookingDate } = slotWindow(dto.endDate, dto.slot);
    const pickupAt = this.resolvePickupAt(dto.startDate, dto.slot, dto.pickupAt);

    return this.prisma.booking.update({
      where: { id },
      data: {
        cameraId: dto.cameraId,
        startBookingDate,
        endBookingDate,
        slot: dto.slot,
        pickupAt,
        amount: pricing.amount,
        discountPercent: pricing.discountPercent,
        note: dto.note !== undefined ? dto.note : booking.note,
        shippingAddress,
      },
      include: bookingInclude,
    });
  }

  async createCustomerBooking(dto: CreateCustomerBookingDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }
    if (customer.customerTag === CustomerTag.BLACKLISTED) {
      throw new ForbiddenException('Không thể đặt lịch với tài khoản này');
    }

    const camera = await this.prisma.camera.findUnique({
      where: { id: dto.cameraId },
    });
    if (!camera) {
      throw new NotFoundException('Máy ảnh không tồn tại');
    }

    this.availability.validateDateRange(dto.startDate, dto.endDate);
    this.availability.validateSlotForRange(
      dto.startDate,
      dto.endDate,
      dto.slot,
    );

    const { available } = await this.availability.isRangeAvailable(
      dto.cameraId,
      dto.startDate,
      dto.endDate,
      dto.slot,
    );
    if (!available) {
      throw new BadRequestException(
        'Không còn chỗ trong một hoặc nhiều ngày đã chọn',
      );
    }

    this.assertDeliveryAllowed(customer, dto.shippingAddress);

    const pricing = await this.computeBookingPricing(
      dto.cameraId,
      dto.startDate,
      dto.endDate,
      dto.slot,
      dto.shippingAddress,
    );

    const { startBookingDate } = slotWindow(dto.startDate, dto.slot);
    const { endBookingDate } = slotWindow(dto.endDate, dto.slot);
    const pickupAt = this.resolvePickupAt(dto.startDate, dto.slot, dto.pickupAt);

    let bookingCode = await this.generateBookingCode();
    for (let i = 0; i < 5; i++) {
      const exists = await this.prisma.booking.findUnique({
        where: { bookingCode },
      });
      if (!exists) break;
      bookingCode = await this.generateBookingCode();
    }

    try {
      return await this.prisma.booking.create({
        data: {
          bookingCode,
          customerId: dto.customerId,
          cameraId: dto.cameraId,
          startBookingDate,
          endBookingDate,
          slot: dto.slot,
          pickupAt,
          amount: pricing.amount,
          discountPercent: pricing.discountPercent,
          note: dto.note,
          shippingAddress: dto.shippingAddress,
          paymentStatus: PaymentStatus.PENDING,
          status: BookingStatus.PENDING_PAYMENT,
          payment: {
            create: {
              provider: 'SEPAY',
              amount: BOOKING_DEPOSIT_VND,
              status: PaymentRecordStatus.PENDING,
              providerTxnRef: bookingCode,
            },
          },
        },
        include: bookingInclude,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException('Mã booking đã tồn tại, thử lại.');
        }
      }
      throw e;
    }
  }

  async create(dto: CreateBookingDto) {
    let bookingCode = dto.bookingCode?.trim();
    if (!bookingCode) {
      bookingCode = await this.generateBookingCode();
    }
    const discountPercent = await this.cameraDiscountPercent(dto.cameraId);

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.prisma.booking.create({
          data: {
            bookingCode,
            customerId: dto.customerId,
            cameraId: dto.cameraId,
            startBookingDate: new Date(dto.startBookingDate),
            endBookingDate: new Date(dto.endBookingDate),
            slot: dto.slot,
            pickupAt: dto.pickupAt ? new Date(dto.pickupAt) : undefined,
            amount: dto.amount,
            discountPercent,
            note: dto.note,
            shippingAddress: dto.shippingAddress,
            paymentStatus: dto.paymentStatus,
            status: dto.status,
          },
          include: bookingInclude,
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === 'P2002' && !dto.bookingCode?.trim()) {
            bookingCode = await this.generateBookingCode();
            continue;
          }
        if (e.code === 'P2002') {
          throw new ConflictException('Mã booking đã tồn tại.');
        }
        if (e.code === 'P2003') {
          throw new ConflictException(
            'customerId hoặc cameraId không hợp lệ (không tồn tại).',
          );
        }
      }
      throw e;
    }
    }
    throw new ConflictException('Mã booking đã tồn tại, thử lại.');
  }

  async update(id: string, dto: UpdateBookingDto) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    if (
      dto.status === BookingStatus.CONFIRMED &&
      existing.pendingChange != null
    ) {
      const applied = await this.applyPendingChangeToBooking(id);
      if (!applied) {
        throw new BadRequestException(
          'Không áp dụng được thay đổi đang chờ — kiểm tra chỗ trống',
        );
      }
      return this.prisma.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CONFIRMED,
          ...(dto.paymentStatus !== undefined
            ? { paymentStatus: dto.paymentStatus }
            : {}),
        },
        include: bookingInclude,
      });
    }

    const { startBookingDate, endBookingDate, pickupAt, ...rest } = dto;
    const data: Prisma.BookingUncheckedUpdateInput = {
      ...rest,
      ...(startBookingDate !== undefined
        ? { startBookingDate: new Date(startBookingDate) }
        : {}),
      ...(endBookingDate !== undefined
        ? { endBookingDate: new Date(endBookingDate) }
        : {}),
      ...(pickupAt !== undefined ? { pickupAt: new Date(pickupAt) } : {}),
    };
    if (dto.cameraId !== undefined) {
      data.discountPercent = await this.cameraDiscountPercent(dto.cameraId);
    }

    try {
      return await this.prisma.booking.update({
        where: { id },
        data,
        include: bookingInclude,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException(`Booking ${id} not found`);
        }
        if (e.code === 'P2002') {
          throw new ConflictException('Mã booking đã tồn tại.');
        }
        if (e.code === 'P2003') {
          throw new ConflictException(
            'customerId hoặc cameraId không hợp lệ (không tồn tại).',
          );
        }
      }
      throw e;
    }
  }

  async remove(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    if (
      booking.status !== BookingStatus.PENDING_PAYMENT &&
      booking.status !== BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Chỉ xóa được đơn chờ cọc hoặc đơn đã hủy.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { bookingId: id } });
        return tx.booking.delete({ where: { id } });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException(`Booking ${id} not found`);
        }
        if (e.code === 'P2003') {
          throw new ConflictException(
            'Không thể xóa đơn do còn dữ liệu liên quan.',
          );
        }
      }
      throw e;
    }
  }
}
