import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatShipOrderNotification,
  type ShipOrderTelegramEvent,
} from '../payment/telegram-booking-notification';
import { FacebookGraphService } from './facebook-graph.service';
import { getMessengerConfig } from './messenger.config';

@Injectable()
export class ShipperMessengerNotifyService {
  private readonly logger = new Logger(ShipperMessengerNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: FacebookGraphService,
  ) {}

  async notifyShipOrderCreated(event: ShipOrderTelegramEvent): Promise<void> {
    const config = getMessengerConfig();
    if (!config.pageAccessToken) {
      this.logger.warn(
        'Shipper Messenger notify skipped: missing FACEBOOK_PAGE_ACCESS_TOKEN',
      );
      return;
    }

    const shippers = await this.prisma.shipper.findMany({
      where: {
        active: true,
        messengerPsid: { not: '' },
      },
      select: { id: true, name: true, messengerPsid: true },
    });
    if (shippers.length === 0) return;

    const text = [
      formatShipOrderNotification(event),
      '',
      'Vào /ship để nhận đơn.',
    ].join('\n');

    for (const shipper of shippers) {
      const psid = shipper.messengerPsid.trim();
      if (!psid) continue;
      try {
        await this.graph.sendProactiveText(psid, text);
      } catch (err) {
        this.logger.warn(
          `Notify shipper ${shipper.name} (${shipper.id}) failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}
