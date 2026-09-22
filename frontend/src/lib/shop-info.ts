import { apiBase } from "@/lib/api-base";
import { getStoreMapUrl } from "@/lib/site-config";

export type PublicShopInfo = {
  phone: string;
  address: string;
  mapUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  mapEmbedUrl?: string | null;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchPublicShopInfo(): Promise<PublicShopInfo> {
  const res = await fetch(`${apiBase()}/api/shop-info/public`);
  return parseJson(res);
}

/** Số gọi tel: — bỏ khoảng trắng, giữ + đầu số. */
export function shopPhoneTelHref(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export function resolveShopMapUrl(
  shopInfo: PublicShopInfo | null | undefined,
): string {
  const fromApi = shopInfo?.mapUrl?.trim();
  if (fromApi) return fromApi;
  return getStoreMapUrl();
}
