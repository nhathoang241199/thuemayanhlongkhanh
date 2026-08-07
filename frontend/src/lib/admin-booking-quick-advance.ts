export type QuickAdvancePaymentStatus =
  | "PENDING"
  | "DEPOSITED"
  | "PAID"
  | "REFUNDED";
export type QuickAdvanceBookingStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "RENTING"
  | "COMPLETED"
  | "CANCELLED"
  | "PENDING_REFUND_CANCEL";

export type QuickAdvancePatch = {
  paymentStatus?: QuickAdvancePaymentStatus;
  status?: QuickAdvanceBookingStatus;
};

export function getQuickAdvancePatch(booking: {
  paymentStatus: string;
  status: string;
}): QuickAdvancePatch | null {
  if (booking.status === "PENDING_REFUND_CANCEL") {
    const patch: QuickAdvancePatch = { status: "CANCELLED" };
    if (booking.paymentStatus !== "REFUNDED") {
      patch.paymentStatus = "REFUNDED";
    }
    return patch;
  }

  const patch: QuickAdvancePatch = {};

  if (booking.paymentStatus === "PENDING") {
    patch.paymentStatus = "DEPOSITED";
  } else if (booking.paymentStatus === "DEPOSITED") {
    patch.paymentStatus = "PAID";
  }

  if (booking.status === "PENDING_PAYMENT") {
    patch.status = "CONFIRMED";
  } else if (booking.status === "CONFIRMED") {
    patch.status = "RENTING";
  } else if (booking.status === "RENTING") {
    patch.status = "COMPLETED";
  }

  if (!patch.paymentStatus && !patch.status) {
    return null;
  }
  return patch;
}

/** Toast ngắn theo từng thay đổi thực tế. */
export function quickAdvanceToastMessages(patch: QuickAdvancePatch): string[] {
  const messages: string[] = [];
  if (patch.paymentStatus === "DEPOSITED") {
    messages.push("Đã cọc");
  }
  if (patch.paymentStatus === "PAID") {
    messages.push("Đã thanh toán");
  }
  if (patch.status === "RENTING") {
    messages.push("Đã lấy máy");
  }
  if (patch.status === "COMPLETED") {
    messages.push("Đã trả máy");
  }
  if (patch.status === "CANCELLED") {
    messages.push("Đã hủy");
  }
  if (patch.paymentStatus === "REFUNDED") {
    messages.push("Đã hoàn tiền");
  }
  return messages;
}

/** Hoàn tác một bước so với nút chuyển tiếp nhanh. */
export function getQuickRevertPatch(booking: {
  paymentStatus: string;
  status: string;
}): QuickAdvancePatch | null {
  if (booking.status === "COMPLETED") {
    return { status: "RENTING" };
  }

  if (booking.status === "RENTING") {
    return { status: "CONFIRMED" };
  }

  if (booking.status === "CONFIRMED") {
    const patch: QuickAdvancePatch = { status: "PENDING_PAYMENT" };
    if (
      booking.paymentStatus === "DEPOSITED" ||
      booking.paymentStatus === "PAID"
    ) {
      patch.paymentStatus = "PENDING";
    }
    return patch;
  }

  if (booking.status === "CANCELLED" && booking.paymentStatus === "REFUNDED") {
    return {
      status: "PENDING_REFUND_CANCEL",
      paymentStatus: "DEPOSITED",
    };
  }

  if (booking.paymentStatus === "PAID") {
    return { paymentStatus: "DEPOSITED" };
  }

  if (
    booking.paymentStatus === "DEPOSITED" &&
    booking.status === "PENDING_PAYMENT"
  ) {
    return { paymentStatus: "PENDING" };
  }

  return null;
}

export function quickRevertToastMessages(patch: QuickAdvancePatch): string[] {
  const messages: string[] = [];
  if (patch.status === "RENTING") {
    messages.push("Đã chuyển về đang thuê");
  }
  if (patch.status === "CONFIRMED") {
    messages.push("Đã chuyển về đã xác nhận");
  }
  if (patch.status === "PENDING_PAYMENT") {
    messages.push("Đã chuyển về chờ cọc");
  }
  if (patch.status === "PENDING_REFUND_CANCEL") {
    messages.push("Đã chuyển về chờ hoàn tiền");
  }
  if (patch.paymentStatus === "DEPOSITED") {
    messages.push("Đã chuyển về đã cọc");
  }
  if (patch.paymentStatus === "PENDING") {
    messages.push("Đã chuyển về chưa cọc");
  }
  return messages;
}
