import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
} from '../../generated/prisma/enums';
import { normalizePhone } from '../common/normalize-phone';
import { CustomerService } from '../customer/customer.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBookingNotificationService } from '../payment/telegram-booking-notification';
import { ShipperMessengerNotifyService } from '../messenger/shipper-messenger-notify.service';
import { vnDateTimeToUtc } from '../common/booking-schedule';
import { shipEarnActionsForBookingStatusChange } from './ship-order-booking-status';
import { SHIP_EARN_VND_PER_LEG } from './ship-order.config';
import type { ShipLeg, ShipOrderStatus, ShipOrderView } from './ship-order.types';
import { resolveShipDisplayStatus } from './ship-order.types';

function startOfTodayVn(): Date {
  const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const y = vnNow.getUTCFullYear();
  const m = String(vnNow.getUTCMonth() + 1).padStart(2, '0');
  const d = String(vnNow.getUTCDate()).padStart(2, '0');
  return vnDateTimeToUtc(`${y}-${m}-${d}`, 0, 0, 0);
}

function isOnOrAfterTodayVn(value: Date | null): boolean {
  if (!value) return false;
  return value.getTime() >= startOfTodayVn().getTime();
}

type BookingForShip = {
  id: string;
  bookingCode: string;
  shippingAddress: string | null;
  status: BookingStatus;
  customer: { name: string; phone: string };
};

const shipOrderInclude = {
  shipper: { select: { name: true } },
  booking: {
    select: {
      pickupAt: true,
      startBookingDate: true,
      endBookingDate: true,
      returnNextMorning: true,
      slot: true,
      customer: { select: { id: true, verificationImageUrls: true } },
    },
  },
} as const;

function scheduleAtForLeg(
  leg: ShipLeg,
  booking:
    | {
        pickupAt: Date | null;
        startBookingDate: Date;
        endBookingDate: Date;
      }
    | null
    | undefined,
  fallback: Date,
): Date {
  if (!booking) return fallback;
  if (leg === 'OUTBOUND') {
    return booking.pickupAt ?? booking.startBookingDate ?? fallback;
  }
  return booking.endBookingDate ?? fallback;
}

@Injectable()
export class ShipOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramBookingNotificationService,
    private readonly shipperMessenger: ShipperMessengerNotifyService,
    private readonly customerService: CustomerService,
  ) {}

  private async notifyNewShipOrder(event: {
    bookingCode: string;
    leg: ShipLeg;
    customerName: string;
    customerPhone: string;
    address: string;
  }): Promise<void> {
    await this.telegram.notifyShipOrderCreated(event);
    await this.shipperMessenger.notifyShipOrderCreated(event).catch((err) => {
      console.warn(
        '[ship-order] Messenger notify shippers failed',
        err instanceof Error ? err.message : err,
      );
    });
  }

  toView(row: {
    id: string;
    bookingId: string;
    bookingCode: string;
    leg: string;
    status: string;
    customerName: string;
    customerPhone: string;
    address: string;
    shipperId: string | null;
    shipper?: { name: string } | null;
    claimedAt: Date | null;
    completedAt: Date | null;
    requestedAt: Date;
    updatedAt: Date;
    booking?: {
      pickupAt: Date | null;
      startBookingDate: Date;
      endBookingDate: Date;
      customer: { id: string; verificationImageUrls: string[] };
    } | null;
  }): ShipOrderView {
    const verificationUrls = row.booking?.customer?.verificationImageUrls ?? [];
    const leg = row.leg as ShipLeg;
    const scheduleAt = scheduleAtForLeg(leg, row.booking, row.requestedAt);
    return {
      id: row.id,
      bookingId: row.bookingId,
      bookingCode: row.bookingCode,
      leg,
      status: row.status as ShipOrderStatus,
      displayStatus: resolveShipDisplayStatus(
        leg,
        row.status as ShipOrderStatus,
      ),
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerId: row.booking?.customer?.id ?? '',
      customerHasVerificationImages: verificationUrls.some(
        (url) => url.trim().length > 0,
      ),
      address: row.address,
      shipperId: row.shipperId,
      shipperName: row.shipper?.name ?? null,
      claimedAt: row.claimedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      scheduleAt: scheduleAt.toISOString(),
      requestedAt: row.requestedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async loadView(id: string): Promise<ShipOrderView> {
    const row = await this.prisma.shipOrder.findUnique({
      where: { id },
      include: shipOrderInclude,
    });
    if (!row) throw new NotFoundException('Không tìm thấy đơn ship');
    return this.toView(row);
  }

  async listPending(): Promise<ShipOrderView[]> {
    await this.syncMissingOutboundOrders();

    const rows = await this.prisma.shipOrder.findMany({
      where: {
        status: 'PENDING',
        booking: {
          status: { notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED] },
          shippingAddress: { not: null },
        },
      },
      orderBy: { requestedAt: 'asc' },
      include: shipOrderInclude,
    });
    return rows
      .filter((row) => row.address.trim().length > 0)
      .map((row) => this.toView(row));
  }

  async listMine(shipperId: string): Promise<ShipOrderView[]> {
    const rows = await this.prisma.shipOrder.findMany({
      where: { shipperId, status: 'CLAIMED' },
      orderBy: { claimedAt: 'asc' },
      include: shipOrderInclude,
    });
    return rows.map((row) => this.toView(row));
  }

  /** Giao xong — khách đang thuê, chờ khách gọi trả. */
  async listWaitingReturn(shipperId: string): Promise<ShipOrderView[]> {
    const rows = await this.prisma.shipOrder.findMany({
      where: {
        shipperId,
        leg: 'OUTBOUND',
        status: 'COMPLETED',
        booking: {
          // Giữ cả PENDING_PAYMENT: shipper có thể giao trước khi cọc kịp confirm.
          status: { not: BookingStatus.CANCELLED },
          shippingAddress: { not: null },
        },
      },
      orderBy: { completedAt: 'desc' },
      include: {
        shipper: { select: { name: true } },
        booking: {
          include: {
            customer: { select: { id: true, verificationImageUrls: true } },
            shipOrders: { where: { leg: 'RETURN' } },
          },
        },
      },
    });

    return rows
      .filter((row) => {
        const ret = row.booking.shipOrders[0];
        const outboundDoneToday = isOnOrAfterTodayVn(row.completedAt);
        const returnActive =
          ret?.status === 'PENDING' || ret?.status === 'CLAIMED';
        const returnDoneToday =
          ret?.status === 'COMPLETED' && isOnOrAfterTodayVn(ret.completedAt);

        // Đã trả xong hôm nay → hiện (DONE) trong tab cần trả.
        if (returnDoneToday) return true;
        // Đã có đơn trả đang xử lý → ưu tiên đơn RETURN trên board, ẩn OUTBOUND.
        if (returnActive) return false;
        // Giao xong hôm nay luôn giữ trên tab cần trả (tránh mất ngay sau khi bấm ▶).
        if (outboundDoneToday) return true;
        if (row.booking.status === BookingStatus.COMPLETED) return false;
        return !ret || ret.status === 'CANCELLED';
      })
      .map((row) => {
        const view = this.toView(row);
        // Tab cần trả: hiện giờ trả máy (end), không dùng giờ nhận/giao.
        const endAt =
          row.booking.endBookingDate ??
          scheduleAtForLeg('RETURN', row.booking, row.requestedAt);
        const withEndSchedule = {
          ...view,
          scheduleAt: endAt.toISOString(),
        };
        const ret = row.booking.shipOrders[0];
        if (ret?.status === 'COMPLETED') {
          return { ...withEndSchedule, displayStatus: 'DONE' as const };
        }
        return withEndSchedule;
      });
  }

  async listByBookingId(bookingId: string): Promise<ShipOrderView[]> {
    const rows = await this.prisma.shipOrder.findMany({
      where: { bookingId },
      orderBy: { requestedAt: 'asc' },
      include: shipOrderInclude,
    });
    return rows.map((row) => this.toView(row));
  }

  async ensureOutbound(
    booking: BookingForShip,
    options?: { notify?: boolean },
  ): Promise<ShipOrderView | null> {
    const address = booking.shippingAddress?.trim();
    if (!address) return null;

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      return null;
    }

    const existing = await this.prisma.shipOrder.findUnique({
      where: {
        bookingId_leg: { bookingId: booking.id, leg: 'OUTBOUND' },
      },
      include: { shipper: { select: { name: true } } },
    });

    if (existing) {
      if (
        existing.status === 'CANCELLED' ||
        existing.customerName !== booking.customer.name ||
        existing.customerPhone !== booking.customer.phone ||
        existing.address !== address ||
        existing.bookingCode !== booking.bookingCode
      ) {
        const row = await this.prisma.shipOrder.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            customerName: booking.customer.name,
            customerPhone: booking.customer.phone,
            address,
            bookingCode: booking.bookingCode,
            shipperId: null,
            claimedAt: null,
            completedAt: null,
          },
          include: { shipper: { select: { name: true } } },
        });
        return this.toView(row);
      }
      return this.toView(existing);
    }

    const row = await this.prisma.shipOrder.create({
      data: {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        leg: 'OUTBOUND',
        status: 'PENDING',
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        address,
      },
      include: { shipper: { select: { name: true } } },
    });

    if (options?.notify !== false) {
      await this.notifyNewShipOrder({
        bookingCode: booking.bookingCode,
        leg: 'OUTBOUND',
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        address,
      });
    }

    return this.toView(row);
  }

  /** Tạo OUTBOUND cho mọi booking có địa chỉ giao (backfill + đồng bộ). */
  async syncMissingOutboundOrders(): Promise<void> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        shippingAddress: { not: null },
        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED] },
      },
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });

    for (const booking of bookings) {
      if (!booking.shippingAddress?.trim()) continue;
      await this.ensureOutbound(
        {
          id: booking.id,
          bookingCode: booking.bookingCode,
          shippingAddress: booking.shippingAddress,
          status: booking.status,
          customer: booking.customer,
        },
        { notify: false },
      );
    }
  }

  async ensureOutboundForBookingId(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: { select: { name: true, phone: true } } },
    });
    if (!booking) return;

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      await this.cancelActiveForBooking(bookingId);
      return;
    }

    if (booking.shippingAddress?.trim()) {
      await this.ensureOutbound({
        id: booking.id,
        bookingCode: booking.bookingCode,
        shippingAddress: booking.shippingAddress,
        status: booking.status,
        customer: booking.customer,
      });
    } else {
      await this.cancelActiveForBooking(bookingId);
    }
  }

  async ensureReturn(bookingId: string, phone: string): Promise<ShipOrderView> {
    const booking = await this.loadCustomerBooking(bookingId, phone);
    const address = booking.shippingAddress?.trim();
    if (!address) {
      throw new BadRequestException('Đơn không có địa chỉ giao hàng.');
    }
    if (booking.status !== BookingStatus.RENTING) {
      throw new BadRequestException('Chỉ gọi trả máy khi đang thuê.');
    }

    const outbound = await this.prisma.shipOrder.findUnique({
      where: {
        bookingId_leg: { bookingId, leg: 'OUTBOUND' },
      },
    });
    if (!outbound || outbound.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Máy chưa được giao — không thể gọi trả máy.',
      );
    }

    const existingReturn = await this.prisma.shipOrder.findUnique({
      where: {
        bookingId_leg: { bookingId, leg: 'RETURN' },
      },
      include: { shipper: { select: { name: true } } },
    });
    if (
      existingReturn &&
      (existingReturn.status === 'PENDING' ||
        existingReturn.status === 'CLAIMED')
    ) {
      throw new BadRequestException('Đã có đơn trả máy đang xử lý.');
    }

    const row = await this.prisma.shipOrder.upsert({
      where: {
        bookingId_leg: { bookingId, leg: 'RETURN' },
      },
      create: {
        bookingId,
        bookingCode: booking.bookingCode,
        leg: 'RETURN',
        status: 'PENDING',
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        address,
      },
      update: {
        status: 'PENDING',
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        address,
        shipperId: null,
        claimedAt: null,
        completedAt: null,
      },
      include: { shipper: { select: { name: true } } },
    });

    await this.notifyNewShipOrder({
      bookingCode: booking.bookingCode,
      leg: 'RETURN',
      customerName: booking.customer.name,
      customerPhone: booking.customer.phone,
      address,
    });

    return this.toView(row);
  }

  async claim(orderId: string, shipperId: string): Promise<ShipOrderView> {
    const result = await this.prisma.shipOrder.updateMany({
      where: { id: orderId, status: 'PENDING', shipperId: null },
      data: {
        shipperId,
        status: 'CLAIMED',
        claimedAt: new Date(),
      },
    });
    if (result.count === 0) {
      throw new ConflictException('Đơn đã có người nhận hoặc không còn khả dụng.');
    }

    return this.loadView(orderId);
  }

  async unclaim(orderId: string, shipperId: string): Promise<ShipOrderView> {
    const result = await this.prisma.shipOrder.updateMany({
      where: { id: orderId, shipperId, status: 'CLAIMED' },
      data: {
        status: 'PENDING',
        shipperId: null,
        claimedAt: null,
      },
    });
    if (result.count === 0) {
      throw new BadRequestException('Không thể trả lại đơn này.');
    }
    return this.loadView(orderId);
  }

  /**
   * Shipper hoàn thành chặng đã nhận (giao hoặc trả).
   * OUTBOUND → cộng tiền, booking → RENTING nếu cần.
   * RETURN → cộng tiền, booking RENTING → COMPLETED.
   */
  async completeByShipper(
    orderId: string,
    shipperId: string,
  ): Promise<ShipOrderView> {
    const order = await this.prisma.shipOrder.findUnique({
      where: { id: orderId },
      include: { booking: { select: { id: true, status: true } } },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn ship');
    }
    if (order.leg !== 'OUTBOUND' && order.leg !== 'RETURN') {
      throw new BadRequestException('Không hỗ trợ hoàn thành loại đơn này.');
    }
    if (order.shipperId !== shipperId || order.status !== 'CLAIMED') {
      throw new ForbiddenException('Không có quyền hoàn thành đơn này.');
    }

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.shipOrder.updateMany({
        where: { id: order.id, shipperId, status: 'CLAIMED' },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      if (result.count === 0) {
        throw new ConflictException('Đơn đã được hoàn thành hoặc không còn khả dụng.');
      }
      await tx.shipper.update({
        where: { id: shipperId },
        data: { balanceVnd: { increment: SHIP_EARN_VND_PER_LEG } },
      });
      if (order.leg === 'OUTBOUND') {
        // Đã giao máy → đang thuê (kể cả khi cọc chưa kịp chuyển CONFIRMED).
        if (
          order.booking.status === BookingStatus.CONFIRMED ||
          order.booking.status === BookingStatus.PENDING_PAYMENT
        ) {
          await tx.booking.update({
            where: { id: order.bookingId },
            data: { status: BookingStatus.RENTING },
          });
        }
      } else if (order.booking.status === BookingStatus.RENTING) {
        await tx.booking.update({
          where: { id: order.bookingId },
          data: { status: BookingStatus.COMPLETED },
        });
      }
    });

    return this.loadView(orderId);
  }

  /** @deprecated alias — dùng completeByShipper */
  async completeOutboundByShipper(
    orderId: string,
    shipperId: string,
  ): Promise<ShipOrderView> {
    return this.completeByShipper(orderId, shipperId);
  }

  /**
   * Hoàn tác hoàn thành giao trong ngày (bấm ▶ nhầm).
   * Chỉ khi chưa có đơn trả đang xử lý.
   */
  async reopenOutboundByShipper(
    orderId: string,
    shipperId: string,
  ): Promise<ShipOrderView> {
    const order = await this.prisma.shipOrder.findUnique({
      where: { id: orderId },
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            shipOrders: { where: { leg: 'RETURN' }, select: { status: true } },
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn ship');
    }
    if (order.leg !== 'OUTBOUND') {
      throw new BadRequestException('Chỉ hoàn tác được đơn giao máy.');
    }
    if (order.shipperId !== shipperId || order.status !== 'COMPLETED') {
      throw new ForbiddenException('Không có quyền hoàn tác đơn này.');
    }
    if (!isOnOrAfterTodayVn(order.completedAt)) {
      throw new BadRequestException(
        'Chỉ hoàn tác được đơn giao hoàn thành trong ngày.',
      );
    }
    const ret = order.booking.shipOrders[0];
    if (ret && (ret.status === 'PENDING' || ret.status === 'CLAIMED')) {
      throw new BadRequestException(
        'Đã có đơn trả máy — không thể hoàn tác giao.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.shipOrder.updateMany({
        where: { id: order.id, shipperId, status: 'COMPLETED' },
        data: {
          status: 'CLAIMED',
          completedAt: null,
        },
      });
      if (result.count === 0) {
        throw new ConflictException('Không thể hoàn tác đơn này.');
      }
      await tx.shipper.update({
        where: { id: shipperId },
        data: { balanceVnd: { decrement: SHIP_EARN_VND_PER_LEG } },
      });
      if (order.booking.status === BookingStatus.RENTING) {
        await tx.booking.update({
          where: { id: order.bookingId },
          data: { status: BookingStatus.CONFIRMED },
        });
      }
    });

    return this.loadView(orderId);
  }

  /**
   * Admin đổi trạng thái booking: hoàn thành chặng ship đã nhận (+ tiền),
   * hoặc hoàn tác khi admin lùi bước.
   */
  async applyBookingStatusChange(
    bookingId: string,
    prevStatus: BookingStatus,
    nextStatus: BookingStatus,
  ): Promise<void> {
    const actions = shipEarnActionsForBookingStatusChange(
      prevStatus,
      nextStatus,
    );

    if (actions.revertReturn) {
      await this.revertSettledLeg(bookingId, 'RETURN');
    }
    if (actions.revertOutbound) {
      await this.revertSettledLeg(bookingId, 'OUTBOUND');
    }
    if (actions.completeOutbound) {
      await this.settleLegForAdmin(bookingId, 'OUTBOUND');
    }
    if (actions.completeReturn) {
      await this.settleLegForAdmin(bookingId, 'RETURN');
    }
    if (actions.cancelActive) {
      await this.cancelActiveForBooking(bookingId);
    }

    await this.ensureOutboundForBookingId(bookingId);
  }

  async uploadCustomerVerification(
    orderId: string,
    shipperId: string,
    file: Express.Multer.File,
  ): Promise<ShipOrderView> {
    const order = await this.prisma.shipOrder.findUnique({
      where: { id: orderId },
      include: {
        booking: { select: { customerId: true } },
      },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn ship');
    }
    if (order.shipperId !== shipperId || order.status !== 'CLAIMED') {
      throw new ForbiddenException('Không có quyền chụp CCCD cho đơn này.');
    }
    if (order.leg !== 'OUTBOUND') {
      throw new BadRequestException('Chỉ chụp CCCD khi giao máy.');
    }

    await this.customerService.addVerificationImage(
      order.booking.customerId,
      file,
    );
    return this.loadView(orderId);
  }

  /** Hoàn thành chặng: cộng tiền nếu shipper đã nhận. */
  private async settleLegForAdmin(
    bookingId: string,
    leg: ShipLeg,
  ): Promise<void> {
    const order = await this.prisma.shipOrder.findUnique({
      where: { bookingId_leg: { bookingId, leg } },
    });
    if (!order || order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      return;
    }

    const shipperId =
      order.status === 'CLAIMED' && order.shipperId ? order.shipperId : null;

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.shipOrder.updateMany({
        where: {
          id: order.id,
          status: { in: ['PENDING', 'CLAIMED'] },
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      if (result.count === 0 || !shipperId) return;

      await tx.shipper.update({
        where: { id: shipperId },
        data: { balanceVnd: { increment: SHIP_EARN_VND_PER_LEG } },
      });
    });
  }

  private async revertSettledLeg(
    bookingId: string,
    leg: ShipLeg,
  ): Promise<void> {
    const order = await this.prisma.shipOrder.findUnique({
      where: { bookingId_leg: { bookingId, leg } },
    });
    if (!order || order.status !== 'COMPLETED') return;

    const shipperId = order.shipperId;

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.shipOrder.updateMany({
        where: { id: order.id, status: 'COMPLETED' },
        data: {
          status: shipperId ? 'CLAIMED' : 'PENDING',
          completedAt: null,
        },
      });
      if (result.count === 0 || !shipperId) return;

      await tx.shipper.update({
        where: { id: shipperId },
        data: { balanceVnd: { decrement: SHIP_EARN_VND_PER_LEG } },
      });
    });
  }

  async cancelActiveForBooking(bookingId: string): Promise<void> {
    await this.prisma.shipOrder.updateMany({
      where: {
        bookingId,
        status: { in: ['PENDING', 'CLAIMED'] },
      },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  private async loadCustomerBooking(bookingId: string, phone: string) {
    const normalized = normalizePhone(phone);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn');
    }
    if (normalizePhone(booking.customer.phone) !== normalized) {
      throw new ForbiddenException('Không có quyền thao tác đơn này');
    }
    return booking;
  }
}
