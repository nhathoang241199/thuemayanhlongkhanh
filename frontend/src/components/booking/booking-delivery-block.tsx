"use client";

import {
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
  Link,
  Stack,
  Text,
  Textarea,
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
  userWarningNoteProps,
  userWarningNoteTextProps,
} from "@/lib/user-theme";

const RETURN_ACTIVE_STATUSES = new Set(["PENDING", "CLAIMED", "READY"]);
const RETURN_REQUESTED_MESSAGE =
  "Đã yêu cầu trả máy, Bạn vui lòng đợi 1 lát để shipper có thể liên hệ.";

function legOrder(
  orders: ShipOrder[] | undefined,
  leg: "OUTBOUND" | "RETURN",
): ShipOrder | undefined {
  return orders?.find((s) => s.leg === leg);
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
  const [returnAddress, setReturnAddress] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const outbound = legOrder(booking.shipOrders, "OUTBOUND");
  const ret = legOrder(booking.shipOrders, "RETURN");

  const canRequestReturn =
    booking.status === "RENTING" &&
    Boolean(outbound) &&
    (!ret || !RETURN_ACTIVE_STATUSES.has(ret.status));
  const returnRequested = Boolean(ret && RETURN_ACTIVE_STATUSES.has(ret.status));

  const submitReturn = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await requestCustomerReturn(booking.id, phone, returnAddress.trim());
      setConfirmOpen(false);
      setSuccess(RETURN_REQUESTED_MESSAGE);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gọi được trả máy");
    } finally {
      setLoading(false);
    }
  }, [booking.id, onUpdated, phone, returnAddress]);

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

        {outbound?.shipper?.name ? (
          <Text fontSize="sm" color="fg.muted">
            Shipper: {" "}
            <Text as="span" fontWeight="medium" color={titleColor}>
              {outbound.shipper.name}
            </Text>
            {outbound.shipper.phone ? (
              <Link
                href={`tel:${outbound.shipper.phone}`}
                color={titleColor}
                fontWeight="medium"
                textDecoration="underline"
                ms={1}
              >
                {outbound.shipper.phone}
              </Link>
            ) : null}
          </Text>
        ) : booking.status === "CONFIRMED" &&
          booking.paymentStatus === "DEPOSITED" ? (
          <Text fontSize="sm" color="fg.muted">
            Đang chờ tạo đơn giao cho shipper.
          </Text>
        ) : null}


        {error ? (
          <Text fontSize="sm" color="red.fg">
            {error}
          </Text>
        ) : null}

        {success || returnRequested ? (
          <Box
            {...userWarningNoteProps}
            bg="green.50"
            borderColor="green.200"
          >
            <Text {...userWarningNoteTextProps} color="green.900">
              {success ?? RETURN_REQUESTED_MESSAGE}
            </Text>
          </Box>
        ) : null}

        {canRequestReturn ? (
          <Button
            flex={1}
            size="sm"
            colorPalette={APP_COLOR_PALETTE}
            loading={loading}
            onClick={() => {
              setReturnAddress(booking.returnAddress?.trim() || address);
              setError(null);
              setSuccess(null);
              setConfirmOpen(true);
            }}
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
              <Text fontSize="sm" mt={3} mb={1} fontWeight="medium">
                Địa chỉ trả máy
              </Text>
              <Textarea
                value={returnAddress}
                onChange={(e) => setReturnAddress(e.target.value)}
                placeholder="Nhập địa chỉ shipper tới lấy máy"
                rows={3}
              />
            </DialogBody>
            <DialogFooter gap={2}>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Huỷ
              </Button>
              <Button
                colorPalette={APP_COLOR_PALETTE}
                loading={loading}
                disabled={!returnAddress.trim()}
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
