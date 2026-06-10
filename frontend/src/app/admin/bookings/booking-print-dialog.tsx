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
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

import {
  APP_COLOR_PALETTE,
  fieldInputProps,
} from "@/lib/app-theme";
import { apiBase } from "@/lib/api-base";
import { throwIfNotOk } from "@/lib/admin-api";
import { slotLabelVi } from "@/lib/booking-status";
import { FREE_KIT_LABEL } from "@/lib/lens-step";
import { getSiteTitle } from "@/lib/site-config";

import type { Booking } from "./booking-types";
import {
  bookingLocalDateKey,
  formatBookingDate,
  formatPickupAtTable,
  vnd,
} from "./booking-list-utils";

import "./booking-print.css";

type BookingPrintDialogProps = {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function SlipRow({ label, value }: { label: string; value: string }) {
  return (
    <Box display="grid" gridTemplateColumns="8.5rem 1fr" gap={2} fontSize="sm">
      <Text fontWeight="semibold">{label}</Text>
      <Text whiteSpace="pre-wrap">{value}</Text>
    </Box>
  );
}

export function BookingPrintDialog({
  booking,
  open,
  onOpenChange,
}: BookingPrintDialogProps) {
  const [cccd, setCccd] = useState("");
  const [termsContent, setTermsContent] = useState("");
  const [termsLoading, setTermsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setCccd("");
      return;
    }
    const ac = new AbortController();
    setTermsLoading(true);
    void (async () => {
      try {
        const res = await fetch(`${apiBase()}/api/booking-terms`, {
          credentials: "include",
          signal: ac.signal,
        });
        await throwIfNotOk(res, "Lỗi tải điều khoản");
        const json = (await res.json()) as { content: string };
        if (!ac.signal.aborted) setTermsContent(json.content ?? "");
      } catch {
        if (!ac.signal.aborted) setTermsContent("");
      } finally {
        if (!ac.signal.aborted) setTermsLoading(false);
      }
    })();
    return () => ac.abort();
  }, [open]);

  const cccdTrim = cccd.trim();
  const canPrint = cccdTrim.length > 0;

  const close = () => onOpenChange(false);

  const handlePrint = () => {
    if (!canPrint) return;
    window.print();
  };

  if (!booking) return null;

  const sameDay =
    bookingLocalDateKey(booking.startBookingDate) ===
    bookingLocalDateKey(booking.endBookingDate);
  const rentalDates = sameDay
    ? formatBookingDate(booking.startBookingDate)
    : `${formatBookingDate(booking.startBookingDate)} – ${formatBookingDate(booking.endBookingDate)}`;
  const balanceDue =
    booking.paymentStatus === "DEPOSITED"
      ? Math.max(0, booking.amount - 50_000)
      : null;

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      lazyMount
      unmountOnExit
      size="lg"
    >
      <DialogBackdrop className="booking-print-no-print" />
      <DialogPositioner className="booking-print-no-print">
        <DialogContent maxW="3xl" w="full" mx={4}>
          <DialogHeader className="booking-print-no-print">
            <DialogTitle>Xem trước phiếu in</DialogTitle>
            <DialogCloseTrigger />
          </DialogHeader>
          <DialogBody>
            <Stack gap={4}>
              <Box className="booking-print-no-print">
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Số CCCD/CMND
                </Text>
                <Input
                  value={cccd}
                  placeholder="Nhập số CCCD/CMND (9–12 chữ số)"
                  inputMode="numeric"
                  {...fieldInputProps}
                  onChange={(e) => setCccd(e.target.value)}
                />
                <Text fontSize="xs" color="fg.muted" mt={1}>
                  Chỉ dùng để in phiếu, không lưu vào hệ thống.
                </Text>
              </Box>

              <Box
                id="booking-print-slip"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                p={6}
                bg="white"
                color="black"
              >
                <Stack gap={4}>
                  <Stack gap={1} textAlign="center">
                    <Text fontSize="lg" fontWeight="bold">
                      {getSiteTitle()}
                    </Text>
                    <Text fontSize="md" fontWeight="semibold">
                      PHIẾU THUÊ MÁY ẢNH
                    </Text>
                  </Stack>

                  <Stack gap={2}>
                    <SlipRow label="Mã đơn:" value={booking.bookingCode} />
                    <SlipRow label="Khách hàng:" value={booking.customer.name} />
                    <SlipRow label="Số điện thoại:" value={booking.customer.phone} />
                    <SlipRow
                      label="CCCD/CMND:"
                      value={cccdTrim || "—"}
                    />
                    <SlipRow
                      label="Máy ảnh:"
                      value={`${booking.camera.brand} — ${booking.camera.name}`}
                    />
                    <SlipRow
                      label="Ống kính:"
                      value={booking.lens?.name ?? FREE_KIT_LABEL}
                    />
                    <SlipRow label="Ngày thuê:" value={rentalDates} />
                    <SlipRow label="Ca thuê:" value={slotLabelVi(booking.slot)} />
                    <SlipRow
                      label="Nhận máy:"
                      value={
                        booking.pickupAt
                          ? formatPickupAtTable(booking.pickupAt)
                          : "—"
                      }
                    />
                    <SlipRow label="Tổng tiền:" value={vnd.format(booking.amount)} />
                    {balanceDue !== null ? (
                      <SlipRow
                        label="Còn lại:"
                        value={vnd.format(balanceDue)}
                      />
                    ) : null}
                    {booking.note?.trim() ? (
                      <SlipRow label="Ghi chú:" value={booking.note.trim()} />
                    ) : null}
                    {booking.shippingAddress?.trim() ? (
                      <SlipRow
                        label="Giao máy:"
                        value={booking.shippingAddress.trim()}
                      />
                    ) : null}
                  </Stack>

                  <Stack gap={2} pt={2}>
                    <Text fontSize="sm" fontWeight="bold">
                      Điều khoản
                    </Text>
                    {termsLoading ? (
                      <Text fontSize="sm" color="gray.600">
                        Đang tải điều khoản…
                      </Text>
                    ) : (
                      <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="tall">
                        {termsContent.trim() || "—"}
                      </Text>
                    )}
                  </Stack>

                  <Box pt={8}>
                    <Box borderBottomWidth="1px" borderColor="black" w="14rem" />
                    <Text fontSize="sm" mt={2}>
                      Khách hàng ký tên
                    </Text>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </DialogBody>
          <DialogFooter gap={2} className="booking-print-no-print">
            <Button variant="ghost" onClick={close}>
              Đóng
            </Button>
            <Button
              colorPalette={APP_COLOR_PALETTE}
              disabled={!canPrint}
              onClick={handlePrint}
            >
              In
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
