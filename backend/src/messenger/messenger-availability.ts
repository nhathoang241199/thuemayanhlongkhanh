import { BookingSlot } from '../../generated/prisma/enums';
import {
  addDaysDateStr,
  todayCalendarDayVN,
} from '../common/booking-schedule';
import { cameraModelShortLabel } from './messenger-formatters';
import { isPriceQuoteQuestion, matchCameraInText } from './messenger-price-quote';
import type { MessengerPronouns } from './messenger-pronouns';
import type { PronounChatTurn } from './messenger-pronouns';
import { resolveMessengerPronouns } from './messenger-pronouns';

export type AvailabilityDate = {
  startDate: string;
  endDate: string;
  label: string;
};

function normalizeAvailText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isAvailabilityQuestion(text: string): boolean {
  if (isPriceQuoteQuestion(text)) return false;
  const norm = normalizeAvailText(text);
  return (
    /con (may|lich|slot)/.test(norm) ||
    /lich trong/.test(norm) ||
    /trong khong/.test(norm) ||
    /het lich/.test(norm) ||
    /con cho thue/.test(norm) ||
    /check lich/.test(norm) ||
    (/\bcon\s+/.test(norm) &&
      (/\bngay\s+(mai|hom nay)\b|\bmai\b|\bhom nay\b/.test(norm) ||
        /\bkhong\b/.test(norm)))
  );
}

export function parseAvailabilityDate(text: string): AvailabilityDate | null {
  const norm = normalizeAvailText(text);
  const today = todayCalendarDayVN();

  if (/\bngay mai\b|\bmai\b/.test(norm) && !/ngay mai nay/.test(norm)) {
    const d = addDaysDateStr(today, 1);
    return { startDate: d, endDate: d, label: 'Ngày mai' };
  }
  if (/\bhom nay\b/.test(norm)) {
    return { startDate: today, endDate: today, label: 'Hôm nay' };
  }
  return null;
}

export function buildBookUrl(frontendUrl: string): string {
  return `${frontendUrl.replace(/\/$/, '')}/book`;
}

export function formatAvailabilityReply(params: {
  dayLabel: string;
  modelLabel?: string;
  available: boolean;
  bookUrl: string;
  pronouns: MessengerPronouns;
}): string {
  const { shop, customer } = params.pronouns;
  const link = buildBookUrl(params.bookUrl);

  if (params.modelLabel) {
    if (params.available) {
      return `${params.modelLabel} ${params.dayLabel} còn nhé ạ, ${customer} lên ${link} đặt lịch giúp ${shop} nhé.`;
    }
    return `${params.modelLabel} ${params.dayLabel} hết lịch rồi ạ, ${customer} thử ngày khác hoặc máy khác giúp ${shop} nhé.`;
  }

  if (params.available) {
    return `${params.dayLabel} ${shop} còn máy ạ, ${customer} lên ${link} xem và đặt lịch giúp ${shop} nhé.`;
  }
  return `${params.dayLabel} ${shop} hết lịch rồi ạ, ${customer} thử ngày khác giúp ${shop} nhé.`;
}

export function resolveAvailabilityReplyInput(
  text: string,
  history: PronounChatTurn[],
  cameras: { name: string; brand: string }[],
  hasAvailableCamera: boolean,
  bookUrl: string,
): string | null {
  if (!isAvailabilityQuestion(text)) return null;
  const date = parseAvailabilityDate(text);
  if (!date) return null;

  const pronouns = resolveMessengerPronouns(text, history);
  const camera = matchCameraInText(text, cameras);
  const modelLabel = camera
    ? cameraModelShortLabel(camera.brand, camera.name)
    : undefined;

  return formatAvailabilityReply({
    dayLabel: date.label,
    modelLabel,
    available: hasAvailableCamera,
    bookUrl,
    pronouns,
  });
}

export const DEFAULT_AVAILABILITY_SLOT = BookingSlot.FULL_DAY;
