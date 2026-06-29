import { clampDiscountPercent } from "@/lib/rental-pricing";

export type ShopPromotion = {
  discountPercent: number;
  startDate: string | null;
  endDate: string | null;
};

export function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

export function isShopPromotionActiveForRental(
  promo: ShopPromotion,
  rentalStart: string,
  rentalEnd: string,
): boolean {
  if (promo.discountPercent <= 0) return false;
  if (!promo.startDate || !promo.endDate) return true;
  return dateRangesOverlap(
    rentalStart,
    rentalEnd,
    promo.startDate,
    promo.endDate,
  );
}

export function resolveEffectiveDiscountPercent(
  equipmentPercent: number,
  promo: ShopPromotion | null,
  rentalStart: string,
  rentalEnd: string,
): number {
  if (
    promo &&
    isShopPromotionActiveForRental(promo, rentalStart, rentalEnd)
  ) {
    return clampDiscountPercent(promo.discountPercent);
  }
  return clampDiscountPercent(equipmentPercent);
}

export function isShopPromotionVisible(promo: ShopPromotion): boolean {
  if (promo.discountPercent <= 0) return false;
  if (!promo.endDate) return true;
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  return todayStr <= promo.endDate;
}

export function formatPromoDateRangeVi(
  startDate: string | null,
  endDate: string | null,
): string | null {
  if (!startDate || !endDate) return null;
  const fmt = (s: string) => {
    const [, m, d] = s.split("-");
    return `${d}/${m}`;
  };
  return `${fmt(startDate)} → ${fmt(endDate)}`;
}
