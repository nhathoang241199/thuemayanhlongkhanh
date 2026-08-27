import { Injectable } from '@nestjs/common';

type NewBookingNotification = {
  customer: { name: string; phone: string };
  camera: { name: string };
  pickupAt: Date;
  note?: string | null;
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
  if (booking.note?.trim()) {
    lines.push(`Note: ${booking.note.trim()}`);
  }
  return lines.join('\n');
}

@Injectable()
export class TelegramBookingNotificationService {
  async notifyNewDeposit(booking: NewBookingNotification): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_NEW_BOOKING_CHAT_ID?.trim();
    if (!token || !chatId) {
      console.warn(
        '[telegram] New-booking notification disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_NEW_BOOKING_CHAT_ID is missing',
      );
      return false;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: formatNewBookingNotification(booking) }),
    });
    if (!response.ok) {
      throw new Error(`Telegram API HTTP ${response.status}`);
    }
    const result = (await response.json()) as { ok?: boolean; description?: string };
    if (!result.ok) {
      throw new Error(result.description ?? 'Telegram API rejected the message');
    }
    return true;
  }
}
