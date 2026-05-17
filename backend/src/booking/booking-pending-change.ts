import { BookingSlot } from '../../generated/prisma/enums';

export type PendingChangePayload = {
  cameraId: string;
  startDate: string;
  endDate: string;
  slot: BookingSlot;
  newAmount: number;
  delta: number;
  note?: string;
  shippingAddress?: string;
};

export function parsePendingChange(raw: unknown): PendingChangePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.cameraId !== 'string' ||
    typeof o.startDate !== 'string' ||
    typeof o.endDate !== 'string' ||
    typeof o.slot !== 'string' ||
    typeof o.newAmount !== 'number' ||
    typeof o.delta !== 'number'
  ) {
    return null;
  }
  return {
    cameraId: o.cameraId,
    startDate: o.startDate,
    endDate: o.endDate,
    slot: o.slot as BookingSlot,
    newAmount: o.newAmount,
    delta: o.delta,
    note: typeof o.note === 'string' ? o.note : undefined,
    shippingAddress:
      typeof o.shippingAddress === 'string' ? o.shippingAddress : undefined,
  };
}
