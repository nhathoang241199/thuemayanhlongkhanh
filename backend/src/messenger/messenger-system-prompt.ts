import { readFileSync } from 'fs';
import { join } from 'path';
import {
  addDaysDateStr,
  todayCalendarDayVN,
} from '../common/booking-schedule';

export function readMessengerDataFile(...parts: string[]): string {
  return readFileSync(join(__dirname, 'data', ...parts), 'utf8');
}

function vnWeekdayLong(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

function buildCurrentDateSection(): string {
  const today = todayCalendarDayVN();
  const tomorrow = addDaysDateStr(today, 1);
  const [year, month] = today.split('-').map(Number);
  const weekday = vnWeekdayLong(new Date());

  return `## Ngày hiện tại (giờ Việt Nam)
- Hôm nay: ${today} (${weekday})
- Ngày mai: ${tomorrow}
- Tháng này: ${month}/${year}
- "Hôm nay", "ngày mai", "cuối tuần" → dùng các ngày trên; **không hỏi lại khách hôm nay là ngày mấy**.`;
}

/** System prompt fanpage — system.md + faq.md + link đặt lịch (dùng chung Messenger & Policy RAG ask). */
export function buildMessengerSystemPrompt(bookUrl: string): string {
  const system = readMessengerDataFile('prompts', 'system.md');
  const faq = readMessengerDataFile('faq.md');
  const base = bookUrl.replace(/\/$/, '');
  return `${system}\n\n${buildCurrentDateSection()}\n\n## FAQ bổ sung\n${faq}\n\n## Link đặt lịch\n${base}/book`;
}
