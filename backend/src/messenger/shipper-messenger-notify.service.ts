import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacebookGraphService } from './facebook-graph.service';
import { getMessengerConfig } from './messenger.config';

@Injectable()
export class ShipperMessengerNotifyService {
  private readonly logger = new Logger(ShipperMessengerNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: FacebookGraphService,
  ) {}

  async notifyReturnRequest(input: {
    shipperId: string;
    customerName: string;
    customerPhone: string;
    address: string;
  }): Promise<void> {
    const config = getMessengerConfig();
    if (!config.pageAccessToken) return;

    const shipper = await this.prisma.shipper.findFirst({
      where: { id: input.shipperId, active: true },
      select: { name: true, messengerPsid: true },
    });
    const psid = shipper?.messengerPsid.trim();
    if (!psid) return;

    const text = `${input.customerName} - ${input.customerPhone} đang yêu cầu trả máy tại: ${input.address}`;
    try {
      await this.graph.sendProactiveText(psid, text);
    } catch (err) {
      this.logger.warn(
        `Notify return request to shipper ${input.shipperId} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
