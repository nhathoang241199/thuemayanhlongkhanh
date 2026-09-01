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
  const normalized = text.trim();
  if (!normalized) return null;

  const dashed = normalized.match(/DH-\d{8}-[A-Z0-9]+/i);
  if (dashed) return dashed[0].toUpperCase();

  const compact = compactPaymentRef(normalized);
  const compactMatch = compact.match(/DH(\d{8})([A-Z0-9]+)/);
  if (compactMatch) {
    return `DH-${compactMatch[1]}-${compactMatch[2]}`;
  }
  return null;
}
