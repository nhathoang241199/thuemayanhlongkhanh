import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatShipOrderNotification,
  type ShipOrderTelegramEvent,
} from '../payment/telegram-booking-notification';
import type {
  DeleteShipperPushSubscriptionDto,
  UpsertShipperPushSubscriptionDto,
} from './dto/shipper-push.dto';

function vapidConfig(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? '';
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? '';
  if (!publicKey || !privateKey) return null;
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    'mailto:admin@thuemayanhlongkhanh.com';
  return { publicKey, privateKey, subject };
}

@Injectable()
export class ShipperPushService {
  private readonly logger = new Logger(ShipperPushService.name);
  private configured = false;

  constructor(private readonly prisma: PrismaService) {
    const cfg = vapidConfig();
    if (cfg) {
      webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
      this.configured = true;
    } else {
      this.logger.warn(
        'Shipper Web Push disabled: missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY',
      );
    }
  }

  getPublicKey(): { publicKey: string | null; enabled: boolean } {
    const cfg = vapidConfig();
    return {
      publicKey: cfg?.publicKey ?? null,
      enabled: Boolean(cfg),
    };
  }

  async upsertSubscription(
    shipperId: string,
    dto: UpsertShipperPushSubscriptionDto,
  ) {
    const endpoint = dto.endpoint.trim();
    const p256dh = dto.keys.p256dh.trim();
    const auth = dto.keys.auth.trim();
    const userAgent = (dto.userAgent ?? '').slice(0, 500);
    return this.prisma.shipperPushSubscription.upsert({
      where: { endpoint },
      create: {
        shipperId,
        endpoint,
        p256dh,
        auth,
        userAgent,
      },
      update: {
        shipperId,
        p256dh,
        auth,
        userAgent,
      },
      select: { id: true, endpoint: true },
    });
  }

  async deleteSubscription(
    shipperId: string,
    dto: DeleteShipperPushSubscriptionDto,
  ) {
    const endpoint = dto.endpoint.trim();
    await this.prisma.shipperPushSubscription.deleteMany({
      where: { shipperId, endpoint },
    });
    return { ok: true };
  }

  async notifyShipOrderCreated(event: ShipOrderTelegramEvent): Promise<void> {
    if (!this.configured) return;

    const rows = await this.prisma.shipperPushSubscription.findMany({
      where: { shipper: { active: true } },
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });
    if (rows.length === 0) return;

    const bodyText = formatShipOrderNotification(event);
    const payload = JSON.stringify({
      title: 'Đơn giao máy mới',
      body: `${event.customerName} · ${event.address}`,
      url: '/ship',
      text: bodyText,
    });

    await Promise.all(
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            payload,
            { TTL: 60 * 60 * 12 },
          );
        } catch (err) {
          const statusCode =
            err && typeof err === 'object' && 'statusCode' in err
              ? Number((err as { statusCode?: number }).statusCode)
              : undefined;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.shipperPushSubscription
              .delete({ where: { id: row.id } })
              .catch(() => undefined);
            return;
          }
          this.logger.warn(
            `Push to ${row.id} failed: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }),
    );
  }

  async notifyShipper(
    shipperId: string,
    input: { title: string; body: string; url?: string },
  ): Promise<void> {
    if (!this.configured) return;
    const rows = await this.prisma.shipperPushSubscription.findMany({
      where: { shipperId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (rows.length === 0) return;
    const payload = JSON.stringify({
      title: input.title,
      body: input.body,
      url: input.url ?? '/ship',
    });
    await Promise.all(
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            payload,
            { TTL: 60 * 60 * 12 },
          );
        } catch (err) {
          const statusCode =
            err && typeof err === 'object' && 'statusCode' in err
              ? Number((err as { statusCode?: number }).statusCode)
              : undefined;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.shipperPushSubscription
              .delete({ where: { id: row.id } })
              .catch(() => undefined);
          }
        }
      }),
    );
  }
}
