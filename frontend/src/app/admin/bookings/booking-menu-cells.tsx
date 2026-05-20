"use client";

import {
  Badge,
  Box,
  Button,
  HStack,
  MenuContent,
  MenuItem,
  MenuItemText,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
  Portal,
  Spinner,
  Text,
} from "@chakra-ui/react";

import type { Booking, BookingStatusValue, PaymentStatusValue } from "./booking-types";
import {
  BOOKING_PAYMENT_EDIT_OPTIONS,
  BOOKING_STATUS_EDIT_OPTIONS,
  paymentBadgeProps,
  statusBadgeProps,
} from "./booking-list-utils";

export function BookingStatusMenuCell({
  booking,
  saving,
  onChangeStatus,
  onMenuOpenChange,
  size = "compact",
}: {
  booking: Booking;
  saving: boolean;
  onChangeStatus: (id: string, status: BookingStatusValue) => void;
  onMenuOpenChange: (open: boolean) => void;
  size?: "compact" | "prominent";
}) {
  const st = statusBadgeProps(booking.status);
  const prominent = size === "prominent";
  return (
    <MenuRoot
      positioning={{
        placement: prominent ? "bottom-end" : "bottom-start",
        gutter: 4,
      }}
      onOpenChange={({ open }) => onMenuOpenChange(open)}
    >
      <MenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={prominent ? "sm" : "xs"}
          h="auto"
          minH="unset"
          px={prominent ? 0 : 1}
          py={prominent ? 0 : 0.5}
          gap={1.5}
          fontWeight="normal"
          cursor={saving ? "wait" : "pointer"}
          disabled={saving}
          opacity={saving ? 0.75 : 1}
          aria-haspopup="menu"
          aria-label={`Trạng thái: ${st.label}. Nhấn để đổi trạng thái`}
          ml={prominent ? "auto" : undefined}
        >
          {saving ? <Spinner size={prominent ? "sm" : "xs"} /> : null}
          <Badge
            variant="subtle"
            colorPalette={st.colorPalette}
            fontSize={prominent ? "sm" : undefined}
          >
            {st.label}
          </Badge>
        </Button>
      </MenuTrigger>
      <Portal>
        <MenuPositioner>
          <MenuContent minW="12rem">
            {BOOKING_STATUS_EDIT_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
                disabled={saving}
                onSelect={() => {
                  if (opt.value !== booking.status) {
                    onChangeStatus(booking.id, opt.value);
                  }
                }}
              >
                <HStack justify="space-between" w="full" gap={2}>
                  <MenuItemText>{opt.label}</MenuItemText>
                  {booking.status === opt.value ? (
                    <Text fontSize="sm" color="fg.muted" aria-hidden>
                      ✓
                    </Text>
                  ) : (
                    <Box w="4" flexShrink={0} aria-hidden />
                  )}
                </HStack>
              </MenuItem>
            ))}
          </MenuContent>
        </MenuPositioner>
      </Portal>
    </MenuRoot>
  );
}

export function BookingPaymentMenuCell({
  booking,
  saving,
  onChangePaymentStatus,
  onMenuOpenChange,
}: {
  booking: Booking;
  saving: boolean;
  onChangePaymentStatus: (
    id: string,
    paymentStatus: PaymentStatusValue,
  ) => void;
  onMenuOpenChange: (open: boolean) => void;
}) {
  const pay = paymentBadgeProps(booking.paymentStatus);
  return (
    <MenuRoot
      positioning={{ placement: "bottom-start", gutter: 4 }}
      onOpenChange={({ open }) => onMenuOpenChange(open)}
    >
      <MenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          h="auto"
          minH="unset"
          px={1}
          py={0.5}
          gap={1.5}
          fontWeight="normal"
          cursor={saving ? "wait" : "pointer"}
          disabled={saving}
          opacity={saving ? 0.75 : 1}
          aria-haspopup="menu"
          aria-label={`Thanh toán: ${pay.label}. Nhấn để đổi trạng thái`}
        >
          {saving ? <Spinner size="xs" /> : null}
          <Badge variant="subtle" colorPalette={pay.colorPalette}>
            {pay.label}
          </Badge>
        </Button>
      </MenuTrigger>
      <Portal>
        <MenuPositioner>
          <MenuContent minW="12rem">
            {BOOKING_PAYMENT_EDIT_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
                disabled={saving}
                onSelect={() => {
                  if (opt.value !== booking.paymentStatus) {
                    onChangePaymentStatus(booking.id, opt.value);
                  }
                }}
              >
                <HStack justify="space-between" w="full" gap={2}>
                  <MenuItemText>{opt.label}</MenuItemText>
                  {booking.paymentStatus === opt.value ? (
                    <Text fontSize="sm" color="fg.muted" aria-hidden>
                      ✓
                    </Text>
                  ) : (
                    <Box w="4" flexShrink={0} aria-hidden />
                  )}
                </HStack>
              </MenuItem>
            ))}
          </MenuContent>
        </MenuPositioner>
      </Portal>
    </MenuRoot>
  );
}
