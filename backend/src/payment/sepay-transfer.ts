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

export function stripTransferPrefix(text: string): string {
  const prefix = sepayTransferPrefix();
  const re = new RegExp(`${prefix}\\s*`, 'gi');
  return text.replace(re, ' ').replace(/\s+/g, ' ').trim();
}

/** Trích mã đơn DH-YYYYMMDD-XXXX từ nội dung CK (có/không dấu gạch, có thể kèm tiền tố NH/SePay). */
export function extractBookingCodeFromTransferText(text: string): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  const dashed = normalized.match(/DH-\d{8}-[A-Z0-9]+/i);
  if (dashed) return dashed[0].toUpperCase();

  const compact = compactPaymentRef(normalized);
  // Ưu tiên đoạn ngay sau SEVQR nếu có (tránh khớp nhầm chuỗi DH trong mã NH).
  const afterSevqr = compact.match(/SEVQR.*?DH(\d{8})([A-Z0-9]{3,8})/);
  if (afterSevqr) {
    return `DH-${afterSevqr[1]}-${afterSevqr[2]}`;
  }

  const compactMatch = compact.match(/DH(\d{8})([A-Z0-9]{3,8})/);
  if (compactMatch) {
    return `DH-${compactMatch[1]}-${compactMatch[2]}`;
  }
  return null;
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
