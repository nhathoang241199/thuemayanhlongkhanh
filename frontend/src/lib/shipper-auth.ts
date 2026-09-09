import { apiBase } from "@/lib/api-base";
import type { ShipDisplayStatus } from "@/lib/ship-display-status";

export const SHIPPER_COOKIE_NAME = "shipper_token";
const SHIPPER_NAME_STORAGE_KEY = "shipper_display_name";

function readStoredShipperName(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(SHIPPER_NAME_STORAGE_KEY)?.trim() ?? "";
}

function storeShipperName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) sessionStorage.setItem(SHIPPER_NAME_STORAGE_KEY, trimmed);
}

export async function shipperLogin(
  phone: string,
  password: string,
): Promise<{ phone: string; name: string }> {
  const res = await fetch(`${apiBase()}/api/auth/shipper/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Đăng nhập thất bại");
  }
  const data = (await res.json()) as { phone: string; name: string };
  storeShipperName(data.name);
  return data;
}

export async function shipperLogout(): Promise<void> {
  await fetch(`${apiBase()}/api/auth/shipper/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export function resolveUploadUrl(url: string | null | undefined): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/api/uploads/")) return parsed.pathname;
    }
  } catch {
    /* keep original */
  }
  return trimmed;
}

export async function fetchShipperSession(): Promise<{
  phone: string;
  name: string;
  balanceVnd: number;
  payoutQrUrl: string;
  payoutRequestedAt: string | null;
  shipperId: string;
} | null> {
  const res = await fetch(`${apiBase()}/api/auth/shipper/me`, {
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  const json = (await res.json()) as {
    phone: string;
    name?: string;
    balanceVnd?: number;
    payoutQrUrl?: string;
    payoutRequestedAt?: string | null;
    shipperId: string;
  };
  const name = json.name?.trim() || readStoredShipperName();
  if (name) storeShipperName(name);
  return {
    phone: json.phone,
    name,
    balanceVnd: json.balanceVnd ?? 0,
    payoutQrUrl: resolveUploadUrl(json.payoutQrUrl),
    payoutRequestedAt: json.payoutRequestedAt?.trim() || null,
    shipperId: json.shipperId,
  };
}

export async function requestShipperPayout(): Promise<void> {
  const res = await fetch(`${apiBase()}/api/auth/shipper/request-payout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text.trim() || "Không gửi được yêu cầu rút";
    try {
      const json = JSON.parse(text) as { message?: string | string[] };
      if (typeof json.message === "string" && json.message.trim()) {
        message = json.message.trim();
      } else if (Array.isArray(json.message) && json.message.length > 0) {
        message = json.message.map(String).join(", ");
      }
    } catch {
      /* keep text */
    }
    throw new Error(message);
  }
}

export type ShipOrder = {
  id: string;
  bookingId: string;
  bookingCode: string;
  leg: "OUTBOUND" | "RETURN";
  status: string;
  displayStatus: ShipDisplayStatus;
  customerName: string;
  customerPhone: string;
  customerId: string;
  customerHasVerificationImages: boolean;
  address: string;
  deliveryAddress: string | null;
  returnAddress: string | null;
  shipperId: string | null;
  shipperName: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  scheduleAt: string;
  requestedAt: string;
  updatedAt: string;
};

export async function fetchPendingShipOrders(): Promise<ShipOrder[]> {
  const res = await fetch(`${apiBase()}/api/ship-orders/pending`, {
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as ShipOrder[];
}

export async function fetchMyShipOrders(): Promise<ShipOrder[]> {
  const res = await fetch(`${apiBase()}/api/ship-orders/mine`, {
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as ShipOrder[];
}

export async function fetchWaitingReturnShipOrders(): Promise<ShipOrder[]> {
  const res = await fetch(`${apiBase()}/api/ship-orders/waiting-return`, {
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as ShipOrder[];
}

export async function claimShipOrder(id: string): Promise<ShipOrder> {
  const res = await fetch(`${apiBase()}/api/ship-orders/${id}/claim`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as ShipOrder;
}

export async function unclaimShipOrder(id: string): Promise<ShipOrder> {
  const res = await fetch(`${apiBase()}/api/ship-orders/${id}/unclaim`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as ShipOrder;
}

export async function completeShipOrder(id: string): Promise<ShipOrder> {
  const res = await fetch(`${apiBase()}/api/ship-orders/${id}/complete`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text.trim() || res.statusText;
    try {
      const json = JSON.parse(text) as { message?: string | string[] };
      if (typeof json.message === "string" && json.message.trim()) {
        message = json.message.trim();
      } else if (Array.isArray(json.message) && json.message.length > 0) {
        message = json.message.map(String).join(", ");
      }
    } catch {
      /* keep text */
    }
    throw new Error(message);
  }
  return (await res.json()) as ShipOrder;
}

export async function reopenShipOrder(id: string): Promise<ShipOrder> {
  const res = await fetch(`${apiBase()}/api/ship-orders/${id}/reopen`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text.trim() || res.statusText;
    try {
      const json = JSON.parse(text) as { message?: string | string[] };
      if (typeof json.message === "string" && json.message.trim()) {
        message = json.message.trim();
      } else if (Array.isArray(json.message) && json.message.length > 0) {
        message = json.message.map(String).join(", ");
      }
    } catch {
      /* keep text */
    }
    throw new Error(message);
  }
  return (await res.json()) as ShipOrder;
}

export async function uploadShipOrderCustomerVerification(
  orderId: string,
  file: File,
): Promise<ShipOrder> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${apiBase()}/api/ship-orders/${orderId}/customer-verification-image`,
    {
      method: "POST",
      credentials: "include",
      body: form,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as ShipOrder;
}

export async function fetchShipperVapidPublicKey(): Promise<string | null> {
  const res = await fetch(`${apiBase()}/api/auth/shipper/push/vapid-public-key`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { publicKey?: string | null };
  return data.publicKey ?? null;
}

export async function subscribeShipperPush(
  subscription: PushSubscriptionJSON,
): Promise<void> {
  if (
    !subscription.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    throw new Error("Subscription Push không hợp lệ");
  }
  const res = await fetch(`${apiBase()}/api/auth/shipper/push/subscribe`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Không lưu được đăng ký thông báo");
  }
}

export async function unsubscribeShipperPush(endpoint: string): Promise<void> {
  const res = await fetch(`${apiBase()}/api/auth/shipper/push/unsubscribe`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Không hủy được đăng ký thông báo");
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/** Register SW, request permission, subscribe PushManager, save to API. */
export async function enableShipperWebPush(): Promise<
  "granted" | "denied" | "unsupported"
> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "unsupported";

  const publicKey = await fetchShipperVapidPublicKey();
  if (!publicKey) {
    throw new Error("Máy chủ chưa cấu hình Web Push (VAPID)");
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        publicKey,
      ) as BufferSource,
    });
  }

  await subscribeShipperPush(subscription.toJSON());
  return "granted";
}
