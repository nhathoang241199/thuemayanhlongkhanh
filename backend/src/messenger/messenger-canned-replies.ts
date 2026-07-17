import { resolveMessengerPronouns } from './messenger-pronouns';

const HOW_TO_RENT_PHRASES = [
  'cách thuê',
  'cach thue',
  'làm sao để thuê',
  'lam sao de thue',
  'làm sao thuê',
  'lam sao thue',
  'hướng dẫn thuê',
  'huong dan thue',
  'quy trình thuê',
  'quy trinh thue',
  'thuê máy ảnh như thế nào',
  'thue may anh nhu the nao',
  'cách đặt lịch',
  'cach dat lich',
] as const;

/** Khách chỉ chào, chưa hỏi máy/giá/lịch. */
export function isGreetingOnly(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 45) return false;
  const lower = t.toLowerCase();
  if (
    /giá|gia\b|bao nhiêu|may|máy|còn|con may|thuê|thue|pin|địa chỉ|dia chi|ship|đặt|dat|book/.test(
      lower,
    )
  ) {
    return false;
  }
  return /^(hi|hello|hey|chào|chao|xin chào|xin chao|alo)(\s+(anh|chi|em|a|ah|ạ|shop|ơi|oi))*\s*$/i.test(
    t,
  );
}

export function greetingReply(text: string): string {
  const { customer } = resolveMessengerPronouns(text);
  return `Hi! ${customer} cần gì ạ`;
}

export function isHowToRentQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return HOW_TO_RENT_PHRASES.some((phrase) => lower.includes(phrase));
}

function normalizeBookingText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Hỏi đặt lịch / book trên web (không phải chỉ hỏi còn máy). */
export function isBookingRedirectQuestion(text: string): boolean {
  if (isHowToRentQuestion(text)) return true;
  const norm = normalizeBookingText(text);
  if (
    /con (may|lich)|lich trong|trong khong/.test(norm) &&
    !/dat lich|dat may|muon dat|book/.test(norm)
  ) {
    return false;
  }
  return (
    /dat lich|dat may|muon dat|muon book|\/book\b|\bbook\b|link dat|kiem tra.*dat|dat tren (web|trang)/.test(
      norm,
    ) || /đặt lịch|đặt máy/.test(text.toLowerCase())
  );
}

export function bookingRedirectReply(siteUrl: string, text: string): string {
  let host = 'thuemayanhlongkhanh.com';
  try {
    host = new URL(siteUrl).host || host;
  } catch {
    // keep default
  }
  const { customer } = resolveMessengerPronouns(text);
  return `Em lên trang ${host} kiểm tra lịch trống và đặt lịch giúp ${customer} nhé.`;
}

export function howToRentReply(siteUrl: string, text = ''): string {
  return bookingRedirectReply(siteUrl, text);
}

const ACCESSORY_REQUEST_HINT =
  /thêm|them|xin|cho|mượn|muon|được không|duoc khong|có được|co duoc|thêm được|them duoc/;

/** Khách xin thêm pin hoặc thẻ (nhớ) khi thuê. */
export function isExtraAccessoryRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!ACCESSORY_REQUEST_HINT.test(lower)) return false;

  const wantsPin = /\bpin\b/.test(lower);
  const wantsCard = /thẻ nhớ|the nho|\bthẻ\b/.test(lower);

  return wantsPin || wantsCard;
}

export function extraAccessoryReply(): string {
  return 'Được nhen';
}

const COLOR_GRADING_PHRASES = ['chỉnh màu', 'chinh mau'] as const;

/** Khách hỏi shop có hỗ trợ chỉnh màu / color grading không. */
export function isColorGradingRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return COLOR_GRADING_PHRASES.some((phrase) => lower.includes(phrase));
}

export function colorGradingReply(): string {
  return 'Anh có hỗ trợ chỉnh màu giúp em nhé';
}

/** Khách hỏi lấy / nhận máy tối hôm trước ngày thuê. */
export function isEarlyPickupQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const asksPickup =
    /(lấy|lay|nhận|nhan).*(máy|may)/.test(lower) ||
    /(máy|may).*(lấy|lay|nhận|nhan)/.test(lower) ||
    /\b(lấy|lay|nhận|nhan)\b/.test(lower);
  const earlyTiming =
    /tối hôm trước|toi hom truoc|hôm trước.*(lấy|lay|nhận|nhan)|(lấy|lay|nhận|nhan).*hôm trước|hom truoc.*(lay|nhan)|(lay|nhan).*hom truoc|lấy sớm|lay som|nhận sớm|nhan som|tối thứ|toi thu/.test(
      lower,
    );
  return asksPickup && earlyTiming;
}

export function earlyPickupReply(): string {
  return 'Được, Với đơn thuê tối thiểu 1 ngày thì em có thể lấy sớm vào tối ngày hôm trước';
}

/** Khách hỏi được trả máy sáng hôm sau / trễ giờ (chỉ trong code — không ghi chính sách công khai). */
export function isLateMorningReturnQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const asksLateReturn =
    /trả trễ|tra tre|trả muộn|tra muon/.test(lower) ||
    (/\b(trả|tra)\b/.test(lower) && /(máy|may)/.test(lower));
  const morningTiming =
    /(sáng|sang).*(thứ|thu|hôm sau|hom sau)|(thứ|thu).*(sáng|sang)|vào sáng|vao sang|trả.*sáng|tra.*sang/.test(
      lower,
    );
  return asksLateReturn && morningTiming;
}

export function lateMorningReturnReply(): string {
  return 'Được nha';
}

/** Khách hỏi trả trễ có tính thêm tiền / phụ thu không (có chunk chính sách). */
export function isLateReturnFeeQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const lateReturn =
    /trả trễ|tra tre|trả muộn|tra muon|trả máy trễ|tra may tre/.test(lower) ||
    (/\b(trả|tra)\b/.test(lower) &&
      /(máy|may)/.test(lower) &&
      /trễ|tre|muộn|muon/.test(lower));
  const asksFee =
    /tính thêm|tinh them|thêm tiền|them tien|phụ thu|phu thu|phí trễ|phi tre|phạt trễ|phat tre|mất tiền|mat tien|mất phí|mat phi|có thêm tiền|co them tien/.test(
      lower,
    );
  const shortFeeQuestion =
    asksFee && /(không|ko)/.test(lower) && lower.length < 80;
  return (lateReturn && asksFee) || shortFeeQuestion;
}

export function lateReturnFeeReply(): string {
  return 'Không nhen';
}

function asksPriceNotDelivery(text: string): boolean {
  return (
    /(^|\s)gi[aá](\s|$)/.test(text) ||
    /bao nhiêu|bao nhieu/.test(text)
  );
}

/** Khách hỏi giao ship hay tự tới shop lấy máy. */
export function isDeliveryPickupQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const delivery =
    /\bship\b|giao hàng|giao hang|giao máy|giao may|giao tận|giao tan|tận nơi|tan noi/.test(
      lower,
    );
  const pickup =
    /tự (tới|toi|đến|den) lấy|tu (toi|den) lay|tự lấy|tu lay|đến shop|den shop|qua shop|tới shop lấy|toi shop lay|mình tự tới|minh tu toi/.test(
      lower,
    );
  if (delivery && pickup) return true;
  if (delivery && /(hay|hoặc|hoac|hay là|hay la)/.test(lower)) return true;
  if (pickup && /(hay|hoặc|hoac|\bship\b|giao)/.test(lower)) return true;
  if (
    delivery &&
    /(không|khong|\bko\b)/.test(lower) &&
    lower.length < 80 &&
    !asksPriceNotDelivery(lower)
  ) {
    return true;
  }
  if (/có (ship|giao)|co (ship|giao)/.test(lower) && lower.length < 80) {
    return !asksPriceNotDelivery(lower);
  }
  return false;
}

export function deliveryPickupReply(): string {
  return 'Shop có hỗ trợ giao & trả tận nơi khu vực Long Khánh, phí ship 20k, hoặc bạn có thể tự tới lấy nhé.';
}

/** Trả lời cố định (không qua Claude). null = gọi Claude. */
export function resolveCannedReply(
  text: string,
  bookUrl?: string,
): string | null {
  if (isGreetingOnly(text)) return greetingReply(text);
  if (isBookingRedirectQuestion(text)) {
    return bookingRedirectReply(
      bookUrl ?? 'https://thuemayanhlongkhanh.com',
      text,
    );
  }
  if (isExtraAccessoryRequest(text)) return extraAccessoryReply();
  if (isColorGradingRequest(text)) return colorGradingReply();
  if (isEarlyPickupQuestion(text)) return earlyPickupReply();
  if (isLateReturnFeeQuestion(text)) return lateReturnFeeReply();
  if (isLateMorningReturnQuestion(text)) return lateMorningReturnReply();
  if (isDeliveryPickupQuestion(text)) return deliveryPickupReply();
  return null;
}
