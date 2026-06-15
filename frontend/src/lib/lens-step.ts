import type { PublicLens } from "@/lib/booking-api";

export const FREE_KIT_LABEL = "Kit";

export function isFreeLens(lens: {
  dayPrice: number;
  shiftPrice: number;
}): boolean {
  return lens.dayPrice === 0 && lens.shiftPrice === 0;
}

/** Lens kit (miễn phí / tên chứa "kit") hiển thị trước trong bước chọn ống kính. */
export function isKitLens(lens: {
  dayPrice: number;
  shiftPrice: number;
  name: string;
}): boolean {
  return isFreeLens(lens) || /kit/i.test(lens.name);
}

export function sortLensesKitFirst<T extends PublicLens>(lenses: T[]): T[] {
  return [...lenses].sort((a, b) => {
    const aKit = isKitLens(a);
    const bKit = isKitLens(b);
    if (aKit !== bKit) return aKit ? -1 : 1;
    return a.name.localeCompare(b.name, "vi");
  });
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
