"use client";

import {
  Badge,
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";

import {
  requestCustomerReturn,
  type MyBooking,
  type ShipOrder,
} from "@/lib/api";
import {
  APP_COLOR_PALETTE,
  mutedAccentColor,
  titleColor,
  userOutlineButtonProps,
} from "@/lib/user-theme";

const ACTIVE_STATUSES = new Set(["PENDING", "CLAIMED"]);

function legOrder(
  orders: ShipOrder[] | undefined,
  leg: "OUTBOUND" | "RETURN",
): ShipOrder | undefined {
  return orders?.find((s) => s.leg === leg);
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Chờ shipper nhận";
    case "CLAIMED":
      return "Shipper đang giao";
    case "COMPLETED":
      return "Đã giao";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "green";
    case "CANCELLED":
      return "red";
    case "CLAIMED":
      return "blue";
    default:
      return "gray";
  }
}

type BookingDeliveryBlockProps = {
  booking: MyBooking;
  phone: string;
  onUpdated: () => void;
};

export function BookingDeliveryBlock({
  booking,
  phone,
  onUpdated,
}: BookingDeliveryBlockProps) {
  const address = booking.shippingAddress?.trim();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const outbound = legOrder(booking.shipOrders, "OUTBOUND");
  const ret = legOrder(booking.shipOrders, "RETURN");

  const canRequestReturn =
    booking.status === "RENTING" &&
    outbound?.status === "COMPLETED" &&
    (!ret || !ACTIVE_STATUSES.has(ret.status));

  const submitReturn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await requestCustomerReturn(booking.id, phone);
      setConfirmOpen(false);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gọi được trả máy");
    } finally {
      setLoading(false);
    }
  }, [booking.id, onUpdated, phone]);

  if (!address) return null;

  return (
    <Box mt={2} pt={2} borderTopWidth="1px" borderColor={mutedAccentColor}>
      <Stack gap={2}>
        <Text fontSize="sm" color="fg.muted">
          Giao tới:{" "}
          <Text as="span" fontWeight="medium" color={titleColor}>
            {address}
          </Text>
        </Text>

        {outbound ? (
          <HStack justify="space-between" gap={2}>
            <Text fontSize="sm">Giao máy</Text>
            <Badge colorPalette={statusColor(outbound.status)} variant="subtle">
              {statusLabel(outbound.status)}
            </Badge>
          </HStack>
        ) : booking.status === "CONFIRMED" &&
          booking.paymentStatus === "DEPOSITED" &&
          !outbound ? (
          <Text fontSize="sm" color="fg.muted">
            Đang chờ tạo đơn giao cho shipper.
          </Text>
        ) : null}

        {ret ? (
          <HStack justify="space-between" gap={2}>
            <Text fontSize="sm">Trả máy</Text>
            <Badge colorPalette={statusColor(ret.status)} variant="subtle">
              {statusLabel(ret.status)}
            </Badge>
          </HStack>
        ) : null}

        {error ? (
          <Text fontSize="sm" color="red.fg">
            {error}
          </Text>
        ) : null}

        {canRequestReturn ? (
          <Button
            size="sm"
            {...userOutlineButtonProps}
            loading={loading}
            onClick={() => setConfirmOpen(true)}
          >
            Trả máy
          </Button>
        ) : null}
      </Stack>

      <DialogRoot
        open={confirmOpen}
        onOpenChange={(e) => {
          if (!e.open) setConfirmOpen(false);
        }}
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gọi shipper lấy máy trả?</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Text fontSize="sm">
                Shipper sẽ tới địa chỉ của bạn để lấy máy trả về shop.
              </Text>
              <Text fontSize="sm" mt={2} color="fg.muted">
                {address}
              </Text>
            </DialogBody>
            <DialogFooter gap={2}>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Huỷ
              </Button>
              <Button
                colorPalette={APP_COLOR_PALETTE}
                loading={loading}
                onClick={() => void submitReturn()}
              >
                Xác nhận
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Box>
  );
}
