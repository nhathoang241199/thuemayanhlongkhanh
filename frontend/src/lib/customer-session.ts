export type CustomerSession = {
  id: string;
  name: string;
  phone: string;
  /** Đồng bộ sau identify / verify; có thể thiếu nếu session cũ — gọi API bổ sung */
  isVerified?: boolean;
};

const STORAGE_KEY = "rental_customer_session";

export function getSession(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerSession;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.phone === "string"
    ) {
      if (
        parsed.isVerified !== undefined &&
        typeof parsed.isVerified !== "boolean"
      ) {
        return null;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setSession(session: CustomerSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
