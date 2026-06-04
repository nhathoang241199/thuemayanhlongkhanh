import type { PublicLens } from "@/lib/booking-api";

export const FREE_KIT_LABEL = "Kit miễn phí";

export function isFreeLens(lens: {
  dayPrice: number;
  shiftPrice: number;
}): boolean {
  return lens.dayPrice === 0 && lens.shiftPrice === 0;
}

/** Bỏ qua bước chọn lens khi không có lens hoặc chỉ một lens miễn phí. */
export function shouldSkipLensStep(lenses: PublicLens[]): boolean {
  if (lenses.length === 0) return true;
  return lenses.length === 1 && isFreeLens(lenses[0]);
}

/** Lens id sau khi skip (auto chọn lens giá 0); null = kit miễn phí. */
export function lensIdAfterSkip(lenses: PublicLens[]): string | null {
  if (lenses.length === 0) return null;
  if (lenses.length === 1 && isFreeLens(lenses[0])) return lenses[0].id;
  return null;
}

export function lensDisplayLabel(
  lens: { name: string } | null | undefined,
): string {
  return lens?.name ?? FREE_KIT_LABEL;
}
