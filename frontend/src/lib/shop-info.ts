import { apiBase } from "@/lib/api-base";
import { getStoreMapUrl } from "@/lib/site-config";

export type PublicShopInfo = {
  phone: string;
  address: string;
  mapUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  /** URL iframe — backend resolve từ mapUrl / địa chỉ / toạ độ */
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

function mapsEmbedFromLatLng(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    q: `${latitude},${longitude}`,
    hl: "vi",
    z: "16",
    output: "embed",
  });
  return `https://www.google.com/maps?${params.toString()}`;
}

function mapsEmbedFromAddress(address: string): string {
  const params = new URLSearchParams({
    q: address.trim(),
    hl: "vi",
    z: "16",
    output: "embed",
  });
  return `https://www.google.com/maps?${params.toString()}`;
}

function parseMapsLatLng(
  url: string,
): { latitude: number; longitude: number } | null {
  const marker = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (marker) {
    const latitude = Number(marker[1]);
    const longitude = Number(marker[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) {
    const latitude = Number(at[1]);
    const longitude = Number(at[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }
  return null;
}

/**
 * URL iframe Google Maps (không cần API key).
 * Ưu tiên mapEmbedUrl từ API, rồi toạ độ / link embed / địa chỉ.
 */
export function googleMapsEmbedSrc(
  shopInfo: PublicShopInfo | null | undefined,
): string | null {
  const fromApi = shopInfo?.mapEmbedUrl?.trim();
  if (fromApi) return fromApi;

  const lat = shopInfo?.latitude;
  const lng = shopInfo?.longitude;
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return mapsEmbedFromLatLng(lat, lng);
  }

  const mapUrl = shopInfo?.mapUrl?.trim() ?? "";
  if (
    mapUrl.includes("/maps/embed") ||
    /[?&]output=embed\b/i.test(mapUrl)
  ) {
    return mapUrl;
  }
  if (mapUrl) {
    const coords = parseMapsLatLng(mapUrl);
    if (coords) {
      return mapsEmbedFromLatLng(coords.latitude, coords.longitude);
    }
  }

  const address = shopInfo?.address?.trim() ?? "";
  if (address) return mapsEmbedFromAddress(address);

  return null;
}
