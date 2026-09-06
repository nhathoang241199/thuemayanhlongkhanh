import { Injectable } from '@nestjs/common';
import https from 'node:https';
import type { ShipLeg } from '../ship-order/ship-order.types';

type NewBookingNotification = {
  customer: { name: string; phone: string };
  camera: { name: string };
  pickupAt: Date;
  note?: string | null;
  shippingAddress?: string | null;
};

export type ShipOrderTelegramEvent = {
  bookingCode: string;
  leg: ShipLeg;
  customerName: string;
  customerPhone: string;
  address: string;
  pickupAt: Date;
};

function formatPickupAt(date: Date): string {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const minute = values.minute === '00' ? '' : values.minute;
  return `${values.day}/${values.month} ${values.hour}h${minute}`;
}

export function formatNewBookingNotification(booking: NewBookingNotification): string {
  const lines = [
    'Đơn thuê mới:',
    '',
    `1. ${booking.customer.name} - ${booking.customer.phone}`,
    `Máy: ${booking.camera.name}`,
    `Nhận lúc: ${formatPickupAt(booking.pickupAt)}`,
  ];
  if (booking.shippingAddress?.trim()) {
    lines.push(`Giao tới: ${booking.shippingAddress.trim()}`);
  }
  if (booking.note?.trim()) {
    lines.push(`Note: ${booking.note.trim()}`);
  }
  return lines.join('\n');
}

function formatShipperPickupAt(date: Date): string {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour24 = Number(values.hour);
  const hour12 = hour24 % 12 || 12;
  const period =
    hour24 === 0
      ? 'đêm'
      : hour24 < 12
        ? 'sáng'
        : hour24 === 12
          ? 'trưa'
          : 'chiều';
  const minute = values.minute === '00' ? '' : values.minute;
  return `${hour12}h${minute} ${period}, ${values.day}/${values.month}`;
}

export function formatShipOrderNotification(event: ShipOrderTelegramEvent): string {
  return [
    'Đơn giao máy mới !',
    '',
    `Khách: ${event.customerName} - ${event.customerPhone}`,
    `Địa chỉ: ${event.address}`,
    `Nhận lúc: ${formatShipperPickupAt(event.pickupAt)}`,
    '',
    'Bấm vào /ship để nhận đơn.',
  ].join('\n');
}

@Injectable()
export class TelegramBookingNotificationService {
  async notifyNewDeposit(booking: NewBookingNotification): Promise<boolean> {
    return this.sendText(formatNewBookingNotification(booking));
  }

  async notifyShipOrderCreated(event: ShipOrderTelegramEvent): Promise<boolean> {
    return this.sendText(formatShipOrderNotification(event));
  }

  private async sendText(text: string): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_NEW_BOOKING_CHAT_ID?.trim();
    if (!token || !chatId) {
      console.warn(
        '[telegram] Notification disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_NEW_BOOKING_CHAT_ID is missing',
      );
      return false;
    }

    const payload = JSON.stringify({
      chat_id: chatId,
      text,
    });
    const result = await new Promise<{ ok?: boolean; description?: string }>(
      (resolve, reject) => {
        const request = https.request(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: 'POST',
            family: 4,
            timeout: 15_000,
            headers: {
              'content-type': 'application/json',
              'content-length': Buffer.byteLength(payload),
            },
          },
          (response) => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', (chunk: string) => {
              body += chunk;
            });
            response.on('end', () => {
              let parsed: { ok?: boolean; description?: string };
              try {
                parsed = JSON.parse(body) as { ok?: boolean; description?: string };
              } catch {
                reject(new Error(`Telegram API HTTP ${response.statusCode}`));
                return;
              }
              if (response.statusCode && response.statusCode >= 400) {
                reject(new Error(`Telegram API HTTP ${response.statusCode}`));
                return;
              }
              resolve(parsed);
            });
          },
        );
        request.on('timeout', () => request.destroy(new Error('Telegram request timed out')));
        request.on('error', reject);
        request.write(payload);
        request.end();
      },
    );
    if (!result.ok) {
      throw new Error(result.description ?? 'Telegram API rejected the message');
    }
    return true;
  }
}
