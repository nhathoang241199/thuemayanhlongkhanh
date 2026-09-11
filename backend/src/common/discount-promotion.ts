import { clampDiscountPercent } from './booking-schedule';

export type ShopPromotionView = {
  discountPercent: number;
  startDate: string | null;
  endDate: string | null;
  targetCameraId: string | null;
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
  promo: ShopPromotionView,
  rentalStart: string,
  rentalEnd: string,
  equipmentId?: string,
): boolean {
  if (promo.discountPercent <= 0) return false;
  if (promo.targetCameraId && promo.targetCameraId !== equipmentId) return false;
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
  promo: ShopPromotionView | null,
  rentalStart: string,
  rentalEnd: string,
  equipmentId?: string,
): number {
  if (
    promo &&
    isShopPromotionActiveForRental(promo, rentalStart, rentalEnd, equipmentId)
  ) {
    return clampDiscountPercent(promo.discountPercent);
  }
  return clampDiscountPercent(equipmentPercent);
}

/** Promo còn hiệu lực marketing (chưa hết hạn hoặc không giới hạn ngày). */
export function isShopPromotionVisible(promo: ShopPromotionView): boolean {
  if (promo.discountPercent <= 0) return false;
  if (!promo.endDate) return true;
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  return todayStr <= promo.endDate;
}
