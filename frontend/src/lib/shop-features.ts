import { apiBase } from "@/lib/api-base";

export type ShopFeatures = {
  printEnabled: boolean;
  updatedAt?: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as T;
}

export async function fetchShopFeatures(): Promise<ShopFeatures> {
  const res = await fetch(`${apiBase()}/api/shop-features`, {
    credentials: "include",
  });
  return parseJson(res);
}

export async function updateShopFeatures(
  data: Pick<ShopFeatures, "printEnabled">,
): Promise<ShopFeatures> {
  const res = await fetch(`${apiBase()}/api/shop-features`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parseJson(res);
}
