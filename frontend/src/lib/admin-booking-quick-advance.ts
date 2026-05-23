export type QuickAdvancePaymentStatus = "DEPOSITED" | "PAID" | "REFUNDED";
export type QuickAdvanceBookingStatus =
  | "CONFIRMED"
  | "RENTING"
  | "COMPLETED"
  | "CANCELLED";

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

/** Mobile: hoàn tất → đang thuê (nhấn nhầm trả máy). */
export function getQuickRevertPatch(booking: {
  status: string;
}): QuickAdvancePatch | null {
  if (booking.status === "COMPLETED") {
    return { status: "RENTING" };
  }
  return null;
}

export function quickRevertToastMessages(patch: QuickAdvancePatch): string[] {
  if (patch.status === "RENTING") {
    return ["Đã chuyển về đang thuê"];
  }
  return [];
}
