/** Cùng logic với backend/src/common/normalize-phone.ts */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("84")) {
    const rest = digits.slice(2);
    if (rest.length === 9) {
      return `0${rest}`;
    }
    if (rest.length === 10 && rest.startsWith("0")) {
      return rest;
    }
  }
  if (digits.length === 9 && /^[35789]/.test(digits)) {
    return `0${digits}`;
  }
  return digits;
}
