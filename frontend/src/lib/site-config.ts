const DEFAULT_SITE_LOCATION_NAME = "Long Khánh";

/** URL Google Maps cửa hàng (Long Khánh) — dùng khi chưa set NEXT_PUBLIC_STORE_MAP_URL. */
const DEFAULT_STORE_MAP_URL =
  "https://maps.app.goo.gl/p7E56GSttpufsQVx5";

/** Tên địa điểm shop — `NEXT_PUBLIC_SITE_LOCATION_NAME` (build-time). */
export function getSiteLocationName(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_LOCATION_NAME?.trim();
  return configured || DEFAULT_SITE_LOCATION_NAME;
}

export function getSiteTitle(): string {
  return `Thuê máy ảnh ${getSiteLocationName()}`;
}

/** Nhãn checkbox giao tận nơi (chưa gồm phí ship). */
export function getDeliveryAreaLabel(): string {
  return `Giao & trả máy tận nơi ${getSiteLocationName()}`;
}

export function getStoreMapUrl(): string {
  const configured = process.env.NEXT_PUBLIC_STORE_MAP_URL?.trim();
  return configured || DEFAULT_STORE_MAP_URL;
}
