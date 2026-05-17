/** Chuẩn hóa SĐT: chỉ giữ chữ số (dùng thống nhất khi lưu/tra cứu). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
