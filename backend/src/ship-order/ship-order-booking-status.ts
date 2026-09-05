import { BookingStatus } from '../../generated/prisma/enums';

export type ShipEarnBookingActions = {
  completeOutbound: boolean;
  completeReturn: boolean;
  revertOutbound: boolean;
  revertReturn: boolean;
  cancelActive: boolean;
};

const cancelledLike: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.PENDING_REFUND_CANCEL,
];

/** Side-effects khi admin đổi trạng thái booking — hoàn thành / hoàn tác chặng ship. */
export function shipEarnActionsForBookingStatusChange(
  prev: BookingStatus,
  next: BookingStatus,
): ShipEarnBookingActions {
  const none: ShipEarnBookingActions = {
    completeOutbound: false,
    completeReturn: false,
    revertOutbound: false,
    revertReturn: false,
    cancelActive: false,
  };
  if (prev === next) return none;

  if (cancelledLike.includes(next)) {
    return { ...none, cancelActive: true };
  }

  const nextIsRenting = next === BookingStatus.RENTING;
  const nextIsCompleted = next === BookingStatus.COMPLETED;
  const prevWasCompleted = prev === BookingStatus.COMPLETED;
  const prevWasActiveRental =
    prev === BookingStatus.RENTING || prev === BookingStatus.COMPLETED;

  return {
    completeOutbound: nextIsRenting || nextIsCompleted,
    completeReturn: nextIsCompleted,
    revertOutbound: prevWasActiveRental && !nextIsRenting && !nextIsCompleted,
    revertReturn: prevWasCompleted && !nextIsCompleted,
    cancelActive: nextIsCompleted,
  };
}
