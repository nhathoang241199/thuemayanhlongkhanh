import { BookingSlot } from '../../generated/prisma/enums';
import {
  discountedRentalVnd,
  rentalAmountWithOptionsVnd,
} from '../common/booking-schedule';
import {
  cameraModelShortLabel,
  formatVndShort,
} from './messenger-formatters';
import { isHowToRentQuestion, isLateReturnFeeQuestion } from './messenger-canned-replies';

export type PriceQuoteCamera = {
  id: string;
  brand: string;
  name: string;
  dayPrice: number;
  shiftPrice: number;
  discountPercent: number;
};

const PRICE_HINT =
  /giá|gia\b|bao nhiêu|bao nhieu|\bbn\b|mấy tiền|may tien|tiền thuê|tien thue|thuê bao|thue bao|đi bao|di bao/;

export function normalizeModelToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '');
}

/** Chuẩn hóa câu khách để match từ riêng (tránh pocket3 dính với số ngày). */
export function normalizeTextForModelMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function textContainsModel(text: string, cameraName: string): boolean {
  const spaced = normalizeTextForModelMatch(text);
  const nameParts = normalizeTextForModelMatch(cameraName).split(' ').filter(Boolean);
  if (nameParts.length) {
    const body = nameParts
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+');
    const spacedPattern = new RegExp(`(?:^| )${body}(?: |$)`);
    if (spacedPattern.test(spaced)) return true;

    const glued = nameParts.join('').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const gluedPattern = new RegExp(`(?:^| )${glued}(?: |$)`);
    if (gluedPattern.test(spaced)) return true;
  }

  const textGlued = spaced.replace(/ /g, '');
  for (const token of modelTokensFromCameraName(cameraName)) {
    if (modelTokenInText(token, spaced, textGlued)) return true;
  }
  return false;
}

function modelTokensFromCameraName(cameraName: string): string[] {
  const norm = normalizeTextForModelMatch(cameraName);
  const raw: string[] = [];
  for (const pattern of [
    /\br\d+(?: ii)?\b/g,
    /\bm\d+\b/g,
    /\bxt\d+\b/g,
    /\bxs\d+\b/g,
    /\bx-t\d+\b/g,
    /\bx100vi\b/g,
    /\bpocket \d+\b/g,
  ]) {
    for (const match of norm.matchAll(pattern)) {
      raw.push(normalizeModelToken(match[0]));
    }
  }
  raw.push(normalizeModelToken(cameraName));
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const token of [...new Set(raw)].sort((a, b) => b.length - a.length)) {
    if (token.length < 2 || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

function modelTokenInText(token: string, spaced: string, textGlued: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`(?:^| )${escaped}(?: |$)`).test(spaced)) return true;
  let idx = textGlued.indexOf(token);
  while (idx !== -1) {
    const beforeOk = idx === 0 || !/[a-z0-9]/.test(textGlued[idx - 1]!);
    const end = idx + token.length;
    const afterOk = end === textGlued.length || !/[a-z0-9]/.test(textGlued[end]!);
    if (beforeOk && afterOk) return true;
    idx = textGlued.indexOf(token, idx + 1);
  }
  return false;
}

/** Khách hỏi giá cụ thể (có từ khóa giá + sẽ match máy trong DB). */
export function isPriceQuoteQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (isHowToRentQuestion(text) || isLateReturnFeeQuestion(text)) return false;
  return PRICE_HINT.test(lower);
}

/** Hỏi tiếp chỉ đổi số ngày — vd. "còn 3 ngày", "thuê 2 ngày". */
export function isDurationFollowUp(text: string): boolean {
  if (!parseDayCount(text)) return false;
  if (isLikelyAvailabilityQuestion(text)) return false;
  if (isPriceQuoteQuestion(text)) return false;
  const norm = normalizeForDurationParse(text).trim();
  return (
    /^(con|thue|muon|vay|the)\b/.test(norm) ||
    /\bthi sao\b/.test(norm) ||
    norm.length <= 35
  );
}

export function isLikelyAvailabilityQuestion(text: string): boolean {
  const norm = normalizeForDurationParse(text);
  return (
    /con (may|slot|lich)\b/.test(norm) ||
    /het (lich|may)\b/.test(norm) ||
    /trong khong/.test(norm) ||
    /check lich/.test(norm)
  );
}

export type PriceQuoteChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export function buildPriceQuoteContext(
  text: string,
  history: PriceQuoteChatTurn[],
): string {
  return [...history, { role: 'user' as const, content: text }]
    .slice(-8)
    .map((m) => m.content)
    .join(' ');
}

export function resolvePriceQuoteRequest(
  text: string,
  cameras: PriceQuoteCamera[],
  history: PriceQuoteChatTurn[] = [],
): { camera: PriceQuoteCamera; dayCount: number } | null {
  const dayCount = parseDayCount(text);
  const cameraInMessage = matchCameraInText(text, cameras);

  if (cameraInMessage && (isPriceQuoteQuestion(text) || dayCount)) {
    return { camera: cameraInMessage, dayCount: dayCount ?? 1 };
  }

  if (dayCount && !cameraInMessage) {
    const context = buildPriceQuoteContext(text, history);
    const cameraFromContext = matchCameraInText(context, cameras);
    if (
      cameraFromContext &&
      (isPriceQuoteQuestion(text) || isDurationFollowUp(text))
    ) {
      return { camera: cameraFromContext, dayCount };
    }
  }

  return null;
}

function normalizeForDurationParse(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function parseDayCount(text: string): number | null {
  const normalized = normalizeForDurationParse(text);
  const week = normalized.match(/(\d+)\s*tuan/);
  if (week) {
    const w = parseInt(week[1], 10);
    return Number.isFinite(w) && w >= 1 ? w * 7 : null;
  }
  const day = normalized.match(/(?<![a-z])(\d+)\s*ngay/);
  if (!day) return null;
  const n = parseInt(day[1], 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export function matchCameraInText<T extends { name: string }>(
  text: string,
  cameras: T[],
): T | null {
  const sorted = [...cameras].sort(
    (a, b) =>
      normalizeModelToken(b.name).length - normalizeModelToken(a.name).length,
  );
  for (const camera of sorted) {
    if (textContainsModel(text, camera.name)) return camera;
  }
  return null;
}

export function computeCameraRentalTotal(
  camera: Pick<PriceQuoteCamera, 'dayPrice' | 'shiftPrice' | 'discountPercent'>,
  dayCount: number,
  slot: BookingSlot = BookingSlot.FULL_DAY,
): number {
  const rental = rentalAmountWithOptionsVnd(
    dayCount,
    camera.dayPrice,
    camera.shiftPrice,
    slot,
  );
  return discountedRentalVnd(rental, camera.discountPercent ?? 0);
}

export function formatPriceQuoteCustomerReply(
  camera: Pick<PriceQuoteCamera, 'brand' | 'name'>,
  dayCount: number,
  totalVnd: number,
): string {
  const label = cameraModelShortLabel(camera.brand, camera.name);
  return `${label} ${dayCount} ngày ${formatVndShort(totalVnd)} nhé ạ.`;
}

export function buildPriceQuoteFromCamera(
  camera: PriceQuoteCamera,
  dayCount: number,
): string {
  const total = computeCameraRentalTotal(camera, dayCount);
  return formatPriceQuoteCustomerReply(camera, dayCount, total);
}
