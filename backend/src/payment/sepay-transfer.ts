/** VietinBank qua SePay API Banking: nội dung CK phải bắt đầu bằng SEVQR */
export function sepayTransferPrefix(): string {
  return (process.env.SEPAY_VIETINBANK_PREFIX ?? 'SEVQR').trim() || 'SEVQR';
}

export function buildTransferContent(bookingCode: string): string {
  return `${sepayTransferPrefix()} ${bookingCode}`;
}

/** Chuẩn hóa để khớp khi NH bỏ dấu gạch trong nội dung CK */
export function compactPaymentRef(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** Mã đơn đầy đủ: DH + YYYYMMDD + hậu tố 3–8 ký tự (không chấp nhận chỉ DH+ngày). */
export function isCompleteBookingCode(value: string): boolean {
  return /^DH\d{8}[A-Z0-9]{3,8}$/.test(compactPaymentRef(value));
}

export function toDashedBookingCode(compactOrDashed: string): string | null {
  const compact = compactPaymentRef(compactOrDashed);
  const match = compact.match(/^DH(\d{8})([A-Z0-9]{3,8})$/);
  if (!match) return null;
  return `DH-${match[1]}-${match[2]}`;
}

export function stripTransferPrefix(text: string): string {
  const prefix = sepayTransferPrefix();
  const re = new RegExp(`${prefix}\\s*`, 'gi');
  return text.replace(re, ' ').replace(/\s+/g, ' ').trim();
}

/** Trích mã đơn DH-YYYYMMDD-XXXX từ nội dung CK (có/không dấu gạch, có thể kèm tiền tố NH/SePay). */
export function extractBookingCodeFromTransferText(text: string): string | null {
  const codes = extractAllBookingCodesFromTransferText(text);
  return codes[0] ?? null;
}

/** Lấy mọi mã đơn ĐẦY ĐỦ có trong nội dung (bỏ mã cụt kiểu DH20260521 của SePay). */
export function extractAllBookingCodesFromTransferText(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const found: string[] = [];
  const push = (code: string) => {
    const dashed = toDashedBookingCode(code);
    if (dashed && !found.includes(dashed)) found.push(dashed);
  };

  for (const match of normalized.matchAll(/DH-\d{8}-[A-Z0-9]{3,8}/gi)) {
    push(match[0]);
  }

  const compact = compactPaymentRef(normalized);
  for (const match of compact.matchAll(/SEVQR.*?DH(\d{8})([A-Z0-9]{3,8})/g)) {
    push(`DH-${match[1]}-${match[2]}`);
  }
  for (const match of compact.matchAll(/DH(\d{8})([A-Z0-9]{3,8})/g)) {
    push(`DH-${match[1]}-${match[2]}`);
  }

  return found.filter((code) => isCompleteBookingCode(code));
}

/**
 * Chuẩn hóa field `code` (Mã thanh toán) từ SePay.
 * Chỉ chấp nhận mã đủ hậu tố — bỏ qua mã cụt như DH20260521 (trùng nhiều đơn trong ngày).
 */
export function normalizeSePayPaymentCode(code?: string | null): string | null {
  if (!code?.trim()) return null;
  const dashed = toDashedBookingCode(code);
  return dashed && isCompleteBookingCode(dashed) ? dashed : null;
}

/** Gom mọi trường text webhook (từng field + nối chung) để NH tách dòng vẫn khớp được. */
export function collectWebhookSearchTexts(fields: string[]): string[] {
  const trimmed = fields.map((field) => field.trim()).filter(Boolean);
  const combined = trimmed.join(' ').replace(/\s+/g, ' ').trim();
  return [...new Set([...trimmed, combined].filter(Boolean))];
}

/** Lấy mọi chuỗi từ payload SePay (content/code/description/…). */
export function collectStringsFromWebhookPayload(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
    return out;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    out.push(String(value));
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStringsFromWebhookPayload(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStringsFromWebhookPayload(item, out);
    }
  }
  return out;
}
