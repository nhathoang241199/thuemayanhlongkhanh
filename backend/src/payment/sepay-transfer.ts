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
  const re = new RegExp(`^${prefix}\\s*`, 'i');
  return text.replace(re, '').trim();
}
