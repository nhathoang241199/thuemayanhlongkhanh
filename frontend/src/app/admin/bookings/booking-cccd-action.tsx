"use client";

import { parseVerificationUrls } from "@/lib/customer-verification-upload";

import { BookingCccdCaptureButton } from "./booking-cccd-capture-button";
import { BookingCccdViewButton } from "./booking-cccd-view-button";

const CCCD_COMPLETE_COUNT = 2;

type BookingCccdActionProps = {
  status: string;
  customerId: string;
  customerName: string;
  verificationImageUrls: unknown;
  disabled?: boolean;
  size?: "sm" | "lg";
  onCccdUploaded?: () => void;
};

export function BookingCccdAction({
  status,
  customerId,
  customerName,
  verificationImageUrls,
  disabled = false,
  size = "lg",
  onCccdUploaded,
}: BookingCccdActionProps) {
  if (status !== "CONFIRMED") {
    return null;
  }

  const urls = parseVerificationUrls(verificationImageUrls);

  if (urls.length >= CCCD_COMPLETE_COUNT) {
    return (
      <BookingCccdViewButton
        customerName={customerName}
        verificationImageUrls={urls}
        disabled={disabled}
        size={size}
      />
    );
  }

  return (
    <BookingCccdCaptureButton
      customerId={customerId}
      customerName={customerName}
      disabled={disabled}
      size={size}
      onUploaded={onCccdUploaded}
    />
  );
}
