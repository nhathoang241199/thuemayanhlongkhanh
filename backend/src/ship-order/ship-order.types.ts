export type ShipLeg = 'OUTBOUND' | 'RETURN';

export type ShipOrderStatus =
  | 'PENDING'
  | 'CLAIMED'
  | 'COMPLETED'
  | 'CANCELLED';

/** Trạng thái hiển thị trên bảng shipper. */
export type ShipDisplayStatus =
  | 'WAIT_CLAIM'
  | 'WAIT_DELIVER'
  | 'WAIT_RETURN'
  | 'DONE';

export const ACTIVE_SHIP_STATUSES: ShipOrderStatus[] = ['PENDING', 'CLAIMED'];

export function resolveShipDisplayStatus(
  leg: ShipLeg,
  status: ShipOrderStatus,
): ShipDisplayStatus {
  if (status === 'CANCELLED') return 'DONE';
  if (leg === 'OUTBOUND') {
    if (status === 'PENDING') return 'WAIT_CLAIM';
    if (status === 'CLAIMED') return 'WAIT_DELIVER';
    return 'WAIT_RETURN';
  }
  if (leg === 'RETURN') {
    if (status === 'PENDING') return 'WAIT_CLAIM';
    if (status === 'CLAIMED') return 'WAIT_RETURN';
    return 'DONE';
  }
  return 'WAIT_CLAIM';
}

export type ShipOrderView = {
  id: string;
  bookingId: string;
  bookingCode: string;
  leg: ShipLeg;
  status: ShipOrderStatus;
  displayStatus: ShipDisplayStatus;
  customerName: string;
  customerPhone: string;
  customerId: string;
  customerHasVerificationImages: boolean;
  address: string;
  shipperId: string | null;
  shipperName: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  /** Thời gian shipper cần tới theo tab: cần nhận/giao = pickupAt; cần trả = end (ngày) hoặc pickup+6h (buổi). */
  scheduleAt: string;
  requestedAt: string;
  updatedAt: string;
};
