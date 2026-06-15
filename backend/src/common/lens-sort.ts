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

export function sortLensesKitFirst<
  T extends { dayPrice: number; shiftPrice: number; name: string },
>(lenses: T[]): T[] {
  return [...lenses].sort((a, b) => {
    const aKit = isKitLens(a);
    const bKit = isKitLens(b);
    if (aKit !== bKit) return aKit ? -1 : 1;
    return a.name.localeCompare(b.name, 'vi');
  });
}
