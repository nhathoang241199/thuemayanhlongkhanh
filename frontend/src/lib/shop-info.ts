import { apiBase } from "@/lib/api-base";
import { getStoreMapUrl } from "@/lib/site-config";

export type PublicShopInfo = {
  phone: string;
  address: string;
  mapUrl: string;
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

/**
 * URL iframe Google Maps (không cần API key).
 * Ưu tiên link embed sẵn; không thì embed theo địa chỉ.
 */
export function googleMapsEmbedSrc(opts: {
  address?: string | null;
  mapUrl?: string | null;
}): string | null {
  const mapUrl = opts.mapUrl?.trim() ?? "";
  if (
    mapUrl.includes("/maps/embed") ||
    /[?&]output=embed\b/i.test(mapUrl)
  ) {
    return mapUrl;
  }

  const address = opts.address?.trim() ?? "";
  if (!address) return null;

  const params = new URLSearchParams({
    q: address,
    hl: "vi",
    z: "16",
    output: "embed",
  });
  return `https://www.google.com/maps?${params.toString()}`;
}
