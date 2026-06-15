export const COLLATERAL_METHODS = [
  "STUDENT_CARD_AND_CCCD",
  "CCCD_AND_2M",
  "HALF_VALUE",
] as const;

export type CollateralMethod = (typeof COLLATERAL_METHODS)[number];

export const COLLATERAL_METHOD_LABELS: Record<CollateralMethod, string> = {
  STUDENT_CARD_AND_CCCD: "Thẻ HSSV + CCCD",
  CCCD_AND_2M: "CCCD + 2tr",
  HALF_VALUE: "50% giá trị",
};

export function isCollateralMethod(value: string): value is CollateralMethod {
  return (COLLATERAL_METHODS as readonly string[]).includes(value);
}

export function collateralMethodLabel(method: CollateralMethod): string {
  return COLLATERAL_METHOD_LABELS[method];
}
