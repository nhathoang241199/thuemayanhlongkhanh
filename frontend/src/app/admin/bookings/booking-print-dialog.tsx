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
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
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
import { saveBookingContract } from "@/lib/booking-collateral-upload";
import { BOOKING_DEPOSIT_VND } from "@/lib/booking-payment";
import { isStrictBookingPolicy } from "@/lib/booking-site-config";
import {
  COLLATERAL_METHODS,
  collateralMethodLabel,
  type CollateralMethod,
  isCollateralMethod,
} from "@/lib/collateral-method";
import { slotLabelVi } from "@/lib/booking-status";
import { FREE_KIT_LABEL } from "@/lib/lens-step";
import { getSiteTitle } from "@/lib/site-config";
import { toaster } from "@/lib/toaster";

import { BookingCollateralCaptureField } from "./booking-collateral-capture-field";
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
  onSaved?: () => void;
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
  onSaved,
}: BookingPrintDialogProps) {
  const strict = isStrictBookingPolicy();
  const [cccd, setCccd] = useState("");
  const [collateralMethod, setCollateralMethod] = useState<CollateralMethod | "">(
    "",
  );
  const [collateralImageUrl, setCollateralImageUrl] = useState<string | null>(
    null,
  );
  const [termsContent, setTermsContent] = useState("");
  const [termsLoading, setTermsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !booking) {
      setCccd("");
      setCollateralMethod("");
      setCollateralImageUrl(null);
      return;
    }
    setCccd(booking.contractCccd ?? "");
    setCollateralMethod(
      booking.collateralMethod && isCollateralMethod(booking.collateralMethod)
        ? booking.collateralMethod
        : "",
    );
    setCollateralImageUrl(booking.collateralImageUrl ?? null);
  }, [open, booking]);

  useEffect(() => {
    if (!open) return;
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
  const canPrint =
    cccdTrim.length > 0 &&
    (!strict || (collateralMethod !== "" && !!collateralImageUrl));

  const close = () => onOpenChange(false);

  const handlePrint = () => {
    if (!booking || !canPrint) return;
    void (async () => {
      setSaving(true);
      try {
        await saveBookingContract(booking.id, {
          contractCccd: cccdTrim,
          ...(strict && collateralMethod
            ? { collateralMethod }
            : {}),
        });
        onSaved?.();
        window.print();
      } catch (e) {
        toaster.error({
          title: "Không lưu được hợp đồng",
          description: e instanceof Error ? e.message : "Lỗi lưu",
        });
      } finally {
        setSaving(false);
      }
    })();
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
      ? Math.max(0, booking.amount - BOOKING_DEPOSIT_VND)
      : null;
  const collateralLabel =
    collateralMethod && isCollateralMethod(collateralMethod)
      ? collateralMethodLabel(collateralMethod)
      : "—";

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      lazyMount
      unmountOnExit
      size="lg"
    >
      <DialogBackdrop className="booking-print-no-print" />
      <DialogPositioner>
        <DialogContent maxW="3xl" w="full" mx={4}>
          <DialogHeader className="booking-print-no-print">
            <DialogTitle>Xem trước phiếu in</DialogTitle>
            <DialogCloseTrigger />
          </DialogHeader>
          <DialogBody>
            <Stack gap={4}>
              <Box className="booking-print-no-print">
                <Stack gap={4}>
                  <Box>
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
                      Lưu vào đơn khi in hợp đồng.
                    </Text>
                  </Box>

                  {strict ? (
                    <>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                          Phương thức cọc
                        </Text>
                        <NativeSelectRoot size="md">
                          <NativeSelectField
                            value={collateralMethod}
                            {...fieldInputProps}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCollateralMethod(
                                isCollateralMethod(v) ? v : "",
                              );
                            }}
                          >
                            <option value="">— Chọn phương thức cọc —</option>
                            {COLLATERAL_METHODS.map((m) => (
                              <option key={m} value={m}>
                                {collateralMethodLabel(m)}
                              </option>
                            ))}
                          </NativeSelectField>
                          <NativeSelectIndicator />
                        </NativeSelectRoot>
                      </Box>

                      <BookingCollateralCaptureField
                        bookingId={booking.id}
                        imageUrl={collateralImageUrl}
                        disabled={saving}
                        onUploaded={setCollateralImageUrl}
                      />
                    </>
                  ) : null}
                </Stack>
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
                    <SlipRow label="CCCD/CMND:" value={cccdTrim || "—"} />
                    {strict ? (
                      <SlipRow
                        label="Phương thức cọc:"
                        value={collateralLabel}
                      />
                    ) : null}
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
              loading={saving}
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
