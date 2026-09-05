export type ShipDisplayStatus =
  | "WAIT_CLAIM"
  | "WAIT_DELIVER"
  | "WAIT_RETURN"
  | "DONE";

const DISPLAY_STATUS_LABEL: Record<ShipDisplayStatus, string> = {
  WAIT_CLAIM: "Nhận đơn",
  WAIT_DELIVER: "Cần giao",
  WAIT_RETURN: "Cần trả",
  DONE: "Hoàn thành",
};

const DISPLAY_STATUS_COLOR: Record<ShipDisplayStatus, string> = {
  WAIT_CLAIM: "blue",
  WAIT_DELIVER: "orange",
  WAIT_RETURN: "orange",
  DONE: "green",
};

const DISPLAY_STATUS_SORT: Record<ShipDisplayStatus, number> = {
  WAIT_DELIVER: 0,
  WAIT_CLAIM: 1,
  WAIT_RETURN: 2,
  DONE: 3,
};

export function shipDisplayStatusLabel(status: ShipDisplayStatus): string {
  return DISPLAY_STATUS_LABEL[status] ?? status;
}

export function shipDisplayStatusColor(status: ShipDisplayStatus): string {
  return DISPLAY_STATUS_COLOR[status] ?? "gray";
}

export function shipDisplayStatusSortKey(status: ShipDisplayStatus): number {
  return DISPLAY_STATUS_SORT[status] ?? 99;
}
