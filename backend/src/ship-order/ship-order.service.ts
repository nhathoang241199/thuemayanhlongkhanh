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
import { vnDateTimeToUtc, shipReturnScheduleAt } from '../common/booking-schedule';
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
  pickupAt: Date | null;
  startBookingDate: Date;
  endBookingDate: Date;
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
      shippingAddress: true,
      returnAddress: true,
      returnNextMorning: true,
      slot: true,
      customer: { select: { id: true, verificationImageUrls: true } },
    },
  },
} as const;

function scheduleAtForDisplayStatus(
  displayStatus: ReturnType<typeof resolveShipDisplayStatus>,
  booking:
    | {
        pickupAt: Date | null;
        startBookingDate: Date;
        endBookingDate: Date;
        slot?: string | null;
        returnNextMorning?: boolean | null;
      }
    | null
    | undefined,
  fallback: Date,
): Date {
  if (!booking) return fallback;
  // Cần trả / hoàn thành → end time (ngày) hoặc nhận + 6h (buổi).
  if (displayStatus === 'WAIT_RETURN' || displayStatus === 'DONE') {
    return shipReturnScheduleAt(booking, fallback);
  }
  // Cần nhận / cần giao → giờ nhận máy.
  return booking.pickupAt ?? booking.startBookingDate ?? fallback;
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
    pickupAt: Date;
  }): Promise<void> {
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
      shippingAddress: string | null;
      returnAddress: string | null;
      slot?: string | null;
      returnNextMorning?: boolean | null;
      customer: { id: string; verificationImageUrls: string[] };
    } | null;
  }): ShipOrderView {
    const verificationUrls = row.booking?.customer?.verificationImageUrls ?? [];
    const leg = row.leg as ShipLeg;
    const displayStatus = resolveShipDisplayStatus(
      leg,
      row.status as ShipOrderStatus,
    );
    const scheduleAt = scheduleAtForDisplayStatus(
      displayStatus,
      row.booking,
      row.requestedAt,
    );
    return {
      id: row.id,
      bookingId: row.bookingId,
      bookingCode: row.bookingCode,
      leg,
      status: row.status as ShipOrderStatus,
      displayStatus,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerId: row.booking?.customer?.id ?? '',
      customerHasVerificationImages: verificationUrls.some(
        (url) => url.trim().length > 0,
      ),
      address: row.address,
      deliveryAddress: row.booking?.shippingAddress ?? null,
      returnAddress: row.booking?.returnAddress ?? row.booking?.shippingAddress ?? null,
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
      where: { shipperId, status: { in: ['CLAIMED', 'READY'] } },
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
          ret?.status === 'PENDING' ||
          ret?.status === 'CLAIMED' ||
          ret?.status === 'READY';
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
        const ret = row.booking.shipOrders[0];
        // DONE vẫn dùng giờ trả (cùng rule WAIT_RETURN).
        if (ret?.status === 'COMPLETED') {
          return {
            ...view,
            displayStatus: 'DONE' as const,
            scheduleAt: scheduleAtForDisplayStatus(
              'DONE',
              row.booking,
              row.requestedAt,
            ).toISOString(),
          };
        }
        return view;
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
    options?: { notify?: boolean; forceNotify?: boolean },
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
      if (options?.forceNotify && existing.status === 'PENDING') {
        await this.notifyNewShipOrder({
          bookingCode: booking.bookingCode,
          leg: 'OUTBOUND',
          customerName: booking.customer.name,
          customerPhone: booking.customer.phone,
          address,
          pickupAt: booking.pickupAt ?? booking.startBookingDate,
        });
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

    if (options?.notify === true) {
      await this.notifyNewShipOrder({
        bookingCode: booking.bookingCode,
        leg: 'OUTBOUND',
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        address,
        pickupAt: booking.pickupAt ?? booking.startBookingDate,
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
          pickupAt: booking.pickupAt,
          startBookingDate: booking.startBookingDate,
          endBookingDate: booking.endBookingDate,
          status: booking.status,
          customer: booking.customer,
        },
        { notify: false },
      );
    }
  }

  async ensureOutboundForBookingId(
    bookingId: string,
    options?: { notify?: boolean; forceNotify?: boolean },
  ): Promise<void> {
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
        pickupAt: booking.pickupAt,
        startBookingDate: booking.startBookingDate,
        endBookingDate: booking.endBookingDate,
        status: booking.status,
        customer: booking.customer,
      },
      options,
    );
    } else {
      await this.cancelActiveForBooking(bookingId);
    }
  }

  async ensureReturn(
    bookingId: string,
    phone: string,
    returnAddressInput?: string,
  ): Promise<ShipOrderView> {
    const booking = await this.loadCustomerBooking(bookingId, phone);
    const address = (
      returnAddressInput?.trim() ||
      booking.returnAddress?.trim() ||
      booking.shippingAddress?.trim() ||
      ''
    );
    if (!address) {
      throw new BadRequestException('Đơn không có địa chỉ trả máy.');
    }
    if (booking.status !== BookingStatus.RENTING) {
      throw new BadRequestException('Chỉ gọi trả máy khi đang thuê.');
    }

    const outbound = await this.prisma.shipOrder.findUnique({
      where: {
        bookingId_leg: { bookingId, leg: 'OUTBOUND' },
      },
      include: { shipper: { select: { id: true } } },
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
        existingReturn.status === 'CLAIMED' ||
        existingReturn.status === 'READY')
    ) {
      throw new BadRequestException('Đã có đơn trả máy đang xử lý.');
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { returnAddress: address },
    });

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

    if (outbound.shipperId) {
      await this.shipperMessenger.notifyReturnRequest({
        shipperId: outbound.shipperId,
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        address,
      });
    }

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
   * Bước tiếp theo trên bảng ship:
   * - OUTBOUND CLAIMED (cần giao) → đánh dấu đã giao → cần trả (chưa hoàn thành đơn)
   * - RETURN CLAIMED (cần giao) → READY → cần trả (chưa hoàn thành)
   * - OUTBOUND COMPLETED / RETURN READY (cần trả) → hoàn thành trả
   */
  async completeByShipper(
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
            shippingAddress: true,
            customer: { select: { name: true, phone: true } },
            shipOrders: { where: { leg: 'RETURN' } },
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn ship');
    }
    if (order.shipperId !== shipperId) {
      throw new ForbiddenException('Không có quyền cập nhật đơn này.');
    }

    // Tab cần trả → hoàn thành trả.
    if (order.leg === 'OUTBOUND' && order.status === 'COMPLETED') {
      return this.completeReturnAfterOutbound(order, shipperId);
    }
    if (order.leg === 'RETURN' && order.status === 'READY') {
      return this.finishReturnReady(order, shipperId);
    }

    // Tab cần giao → chỉ chuyển sang cần trả, không hoàn thành đơn.
    if (order.status !== 'CLAIMED') {
      throw new BadRequestException('Đơn không ở trạng thái cần giao.');
    }

    if (order.leg === 'RETURN') {
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.shipOrder.updateMany({
          where: { id: order.id, shipperId, status: 'CLAIMED' },
          data: { status: 'READY' },
        });
        if (result.count === 0) {
          throw new ConflictException('Đơn đã được cập nhật hoặc không còn khả dụng.');
        }
        await tx.shipper.update({
          where: { id: shipperId },
          data: { balanceVnd: { increment: SHIP_EARN_VND_PER_LEG } },
        });
      });
      return this.loadView(orderId);
    }

    if (order.leg !== 'OUTBOUND') {
      throw new BadRequestException('Không hỗ trợ loại đơn này.');
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
        throw new ConflictException('Đơn đã được cập nhật hoặc không còn khả dụng.');
      }
      await tx.shipper.update({
        where: { id: shipperId },
        data: { balanceVnd: { increment: SHIP_EARN_VND_PER_LEG } },
      });
      if (
        order.booking.status === BookingStatus.CONFIRMED ||
        order.booking.status === BookingStatus.PENDING_PAYMENT
      ) {
        await tx.booking.update({
          where: { id: order.bookingId },
          data: { status: BookingStatus.RENTING },
        });
      }
    });

    return this.loadView(orderId);
  }

  private async finishReturnReady(
    order: {
      id: string;
      bookingId: string;
      booking: { status: BookingStatus };
    },
    shipperId: string,
  ): Promise<ShipOrderView> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.shipOrder.updateMany({
        where: { id: order.id, shipperId, status: 'READY' },
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
      if (order.booking.status === BookingStatus.RENTING) {
        await tx.booking.update({
          where: { id: order.bookingId },
          data: { status: BookingStatus.COMPLETED },
        });
      }
    });
    return this.loadView(order.id);
  }

  /**
   * Từ đơn OUTBOUND đã COMPLETED: upsert RETURN COMPLETED + cộng tiền trả,
   * booking RENTING → COMPLETED.
   */
  private async completeReturnAfterOutbound(
    outbound: {
      id: string;
      bookingId: string;
      bookingCode: string;
      customerName: string;
      customerPhone: string;
      address: string;
      booking: {
        id: string;
        status: BookingStatus;
        shippingAddress: string | null;
        customer: { name: string; phone: string };
        shipOrders: Array<{
          id: string;
          status: string;
          shipperId: string | null;
        }>;
      };
    },
    shipperId: string,
  ): Promise<ShipOrderView> {
    const existing = outbound.booking.shipOrders[0];
    if (existing?.status === 'COMPLETED') {
      return this.loadView(existing.id);
    }
    if (
      existing?.status === 'CLAIMED' &&
      existing.shipperId &&
      existing.shipperId !== shipperId
    ) {
      throw new ForbiddenException('Đơn trả đã có shipper khác nhận.');
    }

    const address =
      outbound.address.trim() ||
      outbound.booking.shippingAddress?.trim() ||
      '';
    if (!address) {
      throw new BadRequestException('Đơn không có địa chỉ giao hàng.');
    }

    const now = new Date();
    const returnId = await this.prisma.$transaction(async (tx) => {
      const row = await tx.shipOrder.upsert({
        where: {
          bookingId_leg: { bookingId: outbound.bookingId, leg: 'RETURN' },
        },
        create: {
          bookingId: outbound.bookingId,
          bookingCode: outbound.bookingCode,
          leg: 'RETURN',
          status: 'COMPLETED',
          customerName: outbound.booking.customer.name || outbound.customerName,
          customerPhone:
            outbound.booking.customer.phone || outbound.customerPhone,
          address,
          shipperId,
          claimedAt: now,
          completedAt: now,
        },
        update: {
          status: 'COMPLETED',
          customerName: outbound.booking.customer.name || outbound.customerName,
          customerPhone:
            outbound.booking.customer.phone || outbound.customerPhone,
          address,
          shipperId,
          claimedAt: existing?.status === 'CLAIMED' ? undefined : now,
          completedAt: now,
        },
      });

      // Cộng tiền chặng trả nếu chưa COMPLETED trước đó.
      if (!existing || existing.status !== 'COMPLETED') {
        await tx.shipper.update({
          where: { id: shipperId },
          data: { balanceVnd: { increment: SHIP_EARN_VND_PER_LEG } },
        });
      }

      if (
        outbound.booking.status === BookingStatus.RENTING ||
        outbound.booking.status === BookingStatus.CONFIRMED
      ) {
        await tx.booking.update({
          where: { id: outbound.bookingId },
          data: { status: BookingStatus.COMPLETED },
        });
      }

      return row.id;
    });

    return this.loadView(returnId);
  }

  /** @deprecated alias — dùng completeByShipper */
  async completeOutboundByShipper(
    orderId: string,
    shipperId: string,
  ): Promise<ShipOrderView> {
    return this.completeByShipper(orderId, shipperId);
  }

  /**
   * Hoàn tác trong ngày: undo hoàn thành trả (DONE), hoặc undo hoàn thành giao.
   */
  async reopenByShipper(
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
            shipOrders: {
              where: { leg: 'RETURN' },
              select: {
                id: true,
                status: true,
                shipperId: true,
                completedAt: true,
              },
            },
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn ship');
    }

    if (order.leg === 'RETURN' && (order.status === 'COMPLETED' || order.status === 'READY')) {
      if (order.status === 'READY') {
        await this.prisma.$transaction(async (tx) => {
          const result = await tx.shipOrder.updateMany({
            where: { id: order.id, shipperId, status: 'READY' },
            data: { status: 'CLAIMED' },
          });
          if (result.count === 0) {
            throw new ConflictException('Không thể hoàn tác đơn này.');
          }
          await tx.shipper.update({
            where: { id: shipperId },
            data: { balanceVnd: { decrement: SHIP_EARN_VND_PER_LEG } },
          });
        });
        return this.loadView(order.id);
      }
      return this.reopenReturnLeg(
        order,
        shipperId,
        order.bookingId,
        order.booking.status,
      );
    }

    if (order.leg === 'OUTBOUND' && order.status === 'COMPLETED') {
      const ret = order.booking.shipOrders[0];
      if (ret?.status === 'COMPLETED') {
        return this.reopenReturnLeg(
          ret,
          shipperId,
          order.bookingId,
          order.booking.status,
        );
      }
      if (ret?.status === 'READY') {
        await this.prisma.shipOrder.updateMany({
          where: { id: ret.id, shipperId, status: 'READY' },
          data: { status: 'CLAIMED' },
        });
        return this.loadView(ret.id);
      }
      return this.reopenOutboundLeg(order, shipperId, ret?.status ?? null);
    }

    throw new BadRequestException('Không thể hoàn tác đơn này.');
  }

  private async reopenReturnLeg(
    ret: {
      id: string;
      status: string;
      shipperId: string | null;
      completedAt: Date | null;
    },
    shipperId: string,
    bookingId: string,
    bookingStatus: BookingStatus,
  ): Promise<ShipOrderView> {
    if (ret.shipperId !== shipperId || ret.status !== 'COMPLETED') {
      throw new ForbiddenException('Không có quyền hoàn tác đơn trả này.');
    }
    if (!isOnOrAfterTodayVn(ret.completedAt)) {
      throw new BadRequestException(
        'Chỉ hoàn tác được đơn trả hoàn thành trong ngày.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.shipOrder.updateMany({
        where: { id: ret.id, shipperId, status: 'COMPLETED' },
        data: {
          // Undo hoàn thành → về cần trả (READY), không về cần giao.
          status: 'READY',
          completedAt: null,
        },
      });
      if (result.count === 0) {
        throw new ConflictException('Không thể hoàn tác đơn trả này.');
      }
      await tx.shipper.update({
        where: { id: shipperId },
        data: { balanceVnd: { decrement: SHIP_EARN_VND_PER_LEG } },
      });
      if (bookingStatus === BookingStatus.COMPLETED) {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.RENTING },
        });
      }
    });

    return this.loadView(ret.id);
  }

  private async reopenOutboundLeg(
    order: {
      id: string;
      bookingId: string;
      shipperId: string | null;
      completedAt: Date | null;
      booking: { status: BookingStatus };
    },
    shipperId: string,
    returnStatus: string | null,
  ): Promise<ShipOrderView> {
    if (order.shipperId !== shipperId) {
      throw new ForbiddenException('Không có quyền hoàn tác đơn này.');
    }
    if (!isOnOrAfterTodayVn(order.completedAt)) {
      throw new BadRequestException(
        'Chỉ hoàn tác được đơn giao hoàn thành trong ngày.',
      );
    }
    if (returnStatus === 'PENDING' || returnStatus === 'CLAIMED' || returnStatus === 'READY') {
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

    return this.loadView(order.id);
  }

  /** @deprecated alias */
  async reopenOutboundByShipper(
    orderId: string,
    shipperId: string,
  ): Promise<ShipOrderView> {
    return this.reopenByShipper(orderId, shipperId);
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
      (order.status === 'CLAIMED' || order.status === 'READY') && order.shipperId
        ? order.shipperId
        : null;

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.shipOrder.updateMany({
        where: {
          id: order.id,
          status: { in: ['PENDING', 'CLAIMED', 'READY'] },
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
        status: { in: ['PENDING', 'CLAIMED', 'READY'] },
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
