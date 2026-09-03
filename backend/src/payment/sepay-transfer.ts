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
  const codes = extractAllBookingCodesFromTransferText(text);
  return codes[0] ?? null;
}

/** Lấy mọi mã đơn có trong nội dung (ưu tiên đoạn sau SEVQR). */
export function extractAllBookingCodesFromTransferText(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const found: string[] = [];
  const push = (code: string) => {
    const upper = code.toUpperCase();
    if (!found.includes(upper)) found.push(upper);
  };

  for (const match of normalized.matchAll(/DH-\d{8}-[A-Z0-9]{3,8}/gi)) {
    push(match[0]);
  }

  const compact = compactPaymentRef(normalized);
  const afterSevqr = [...compact.matchAll(/SEVQR.*?DH(\d{8})([A-Z0-9]{3,8})/g)];
  for (const match of afterSevqr) {
    push(`DH-${match[1]}-${match[2]}`);
  }

  for (const match of compact.matchAll(/DH(\d{8})([A-Z0-9]{3,8})/g)) {
    push(`DH-${match[1]}-${match[2]}`);
  }

  return found;
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
