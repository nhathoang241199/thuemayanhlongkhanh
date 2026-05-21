"use client";

import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  IconButton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";

import { VerificationImageGallery } from "@/app/admin/customers/verification-image-gallery";
import { titleColor } from "@/lib/app-theme";

import { ImageIcon } from "./booking-list-icons";

const CCCD_VIEW_COUNT = 2;

type BookingCccdViewButtonProps = {
  customerName: string;
  verificationImageUrls: string[];
  disabled?: boolean;
  size?: "sm" | "lg";
};

export function BookingCccdViewButton({
  customerName,
  verificationImageUrls,
  disabled = false,
  size = "lg",
}: BookingCccdViewButtonProps) {
  const [open, setOpen] = useState(false);
  const previewUrls = verificationImageUrls.slice(0, CCCD_VIEW_COUNT);

  if (previewUrls.length < CCCD_VIEW_COUNT) {
    return null;
  }

  return (
    <>
      <IconButton
        type="button"
        size={size}
        variant="subtle"
        colorPalette="blue"
        aria-label={`Xem CCCD — ${customerName}`}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <ImageIcon boxSize={size === "lg" ? "1.35rem" : undefined} />
      </IconButton>

      <DialogRoot
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        lazyMount
        unmountOnExit
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="md" mx={4}>
            <DialogHeader>
              <DialogTitle color={titleColor}>
                CCCD — {customerName}
              </DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody pb={6}>
              <Stack gap={3}>
                <Text fontSize="sm" color="fg.muted">
                  Mặt trước · mặt sau
                </Text>
                <VerificationImageGallery urls={previewUrls} layout="stack" />
              </Stack>
            </DialogBody>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </>
  );
}
