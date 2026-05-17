/** Ngày mặc định khi thêm chi phí cho kỳ year/month (UTC). */
export function defaultExpenseDateInput(year: number, month: number): string {
  const now = new Date();
  const curY = now.getUTCFullYear();
  const curM = now.getUTCMonth() + 1;
  const day =
    year === curY && month === curM
      ? now.getUTCDate()
      : 1;
  return utcDateInput(year, month, day);
}

export function utcDateInput(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD → { year, month, day } (UTC calendar parts). */
export function parseDateInput(value: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  const day = Number.parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function dateInPeriod(
  parts: { year: number; month: number; day: number },
  periodYear: number,
  periodMonth: number,
): boolean {
  return parts.year === periodYear && parts.month === periodMonth;
}

export function expenseDateToIso(parts: {
  year: number;
  month: number;
  day: number;
}): string {
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0),
  ).toISOString();
}

export function expenseDateFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return utcDateInput(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
  );
}

export function currentUtcYearMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  };
}
