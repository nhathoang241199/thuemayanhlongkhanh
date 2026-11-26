export type CustomerSession = {
  id: string;
  name: string;
  phone: string;
  /** Đồng bộ sau identify / verify; có thể thiếu nếu session cũ — gọi API bổ sung */
  isVerified?: boolean;
};

const STORAGE_KEY = "rental_customer_session";
const HOME_INTRO_KEY = "rental_home_intro";
/** Còn true trong nhịp render kép của React, rồi tắt để lần vào sau không chạy lại. */
let homeIntroPending = false;

/** Bật một lần, ngay sau khi khách vừa nhập tên và số điện thoại. */
export function markHomeIntro(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(HOME_INTRO_KEY, "1");
}

/** Đọc rồi xóa cờ, để lần vào /home sau không chạy lại lời chào. */
export function consumeHomeIntro(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(HOME_INTRO_KEY) === "1") {
    sessionStorage.removeItem(HOME_INTRO_KEY);
    homeIntroPending = true;
    window.setTimeout(() => {
      homeIntroPending = false;
    }, 0);
    return true;
  }
  return homeIntroPending;
}

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
