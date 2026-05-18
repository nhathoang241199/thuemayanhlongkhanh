"use client";

import {
  Badge,
  Box,
  Button,
  CardBody,
  CardRoot,
  createIcon,
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
  IconButton,
  Link,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CameraTutorialDialog } from "@/components/camera/camera-tutorial-dialog";
import {
  cancelCustomerBooking,
  fetchMyBookings,
  type MyBooking,
} from "@/lib/api";
import {
  bookingStatusColor,
  bookingStatusLabel,
  formatBookingRange,
  slotLabelVi,
  slotTimeRangeLabel,
} from "@/lib/booking-status";
import type { CameraBrand } from "@/lib/booking-api";
import {
  BOOKING_CANCEL_REFUND_VND,
  balanceDueVnd,
  isCancelRefundEligible,
} from "@/lib/booking-payment";
import { BRAND_LABEL } from "@/lib/camera-brands";
import { getSession, type CustomerSession } from "@/lib/customer-session";
import {
  APP_COLOR_PALETTE,
  mutedAccentColor,
  titleColor,
  userBookingCardProps,
  userFieldInputProps,
  userOutlineButtonProps,
} from "@/lib/user-theme";

const GUIDE_STATUSES = new Set(["CONFIRMED", "RENTING", "LATE_RETURN"]);

const STORE_MAP_URL = "https://maps.app.goo.gl/p7E56GSttpufsQVx5";

const inlineTextLinkProps = {
  fontSize: "sm",
  color: "cerulean.700",
  textDecoration: "underline",
  cursor: "pointer",
} as const;

function cameraDisplayName(brand: string, name: string) {
  const label = BRAND_LABEL[brand as CameraBrand] ?? brand;
  return `${label} ${name}`;
}

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const cancelButtonProps = {
  bg: "red.400",
  color: "white",
  _hover: { bg: "red.500" },
  _active: { bg: "red.500" },
};

const TrashIcon = createIcon({
  displayName: "TrashIcon",
  path: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 6h18"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      />
    </>
  ),
});

export default function UserHomePage() {
  const router = useRouter();
  const [session, setSessionState] = useState<CustomerSession | null>(null);
  const [bookings, setBookings] = useState<MyBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MyBooking | null>(null);
  const [bankAccountInfo, setBankAccountInfo] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [guideCamera, setGuideCamera] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const cancelRefundEligible = useMemo(() => {
    if (!cancelTarget) return false;
    return isCancelRefundEligible(cancelTarget.startBookingDate);
  }, [cancelTarget]);

  const loadBookings = useCallback(async (phone: string) => {
    setError(null);
    try {
      const list = await fetchMyBookings(phone);
      setBookings(list);
    } catch (e) {
      setBookings(null);
      setError(e instanceof Error ? e.message : "Không tải được đơn thuê.");
    }
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/");
      return;
    }
    setSessionState(s);
    void loadBookings(s.phone);
  }, [router, loadBookings]);

  const closeCancelModal = () => {
    setCancelTarget(null);
    setBankAccountInfo("");
    setCancelError(null);
  };

  const handleCancelSubmit = async () => {
    if (!session || !cancelTarget) return;
    if (cancelRefundEligible) {
      const info = bankAccountInfo.trim();
      if (!info) {
        setCancelError("Vui lòng nhập thông tin tài khoản ngân hàng.");
        return;
      }
    }
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      await cancelCustomerBooking(
        cancelTarget.id,
        session.phone,
        cancelRefundEligible ? bankAccountInfo.trim() : undefined,
      );
      closeCancelModal();
      await loadBookings(session.phone);
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Không hủy được đơn.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleDeletePending = async (b: MyBooking) => {
    if (!session) return;
    if (!window.confirm("Bạn có chắc muốn huỷ đơn này?")) return;
    setDeletePendingId(b.id);
    setError(null);
    try {
      await cancelCustomerBooking(b.id, session.phone);
      await loadBookings(session.phone);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không huỷ được đơn.");
    } finally {
      setDeletePendingId(null);
    }
  };

  if (!session) {
    return (
      <Text color="fg.muted" textAlign="center" py={8}>
        Đang tải…
      </Text>
    );
  }

  return (
    <Stack gap={4} pb={24}>
      <Box>
        <Text textStyle="xl" fontWeight="bold" color={titleColor}>
          Xin chào, {session.name}
        </Text>
        <Text fontSize="sm" color={mutedAccentColor}>
          {session.phone}
        </Text>
      </Box>

      <Text fontWeight="semibold" color={titleColor}>
        Đơn đặt lịch của bạn
      </Text>

      {error ? (
        <Text color="red.fg" fontSize="sm">
          {error}
        </Text>
      ) : null}

      {bookings === null && !error ? (
        <Text color="fg.muted" fontSize="sm">
          Đang tải đơn…
        </Text>
      ) : null}

      {bookings?.length === 0 ? (
        <CardRoot {...userBookingCardProps}>
          <CardBody>
            <Text color="fg.muted" textAlign="center">
              Bạn chưa có đơn thuê nào.
            </Text>
            <Text color="fg.muted" textAlign="center" fontSize="sm" mt={1}>
              Nhấn Đặt lịch bên dưới để bắt đầu.
            </Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {bookings?.map((b) => {
        const canModify =
          b.status === "CONFIRMED" && b.paymentStatus === "DEPOSITED";
        const balanceDue =
          b.paymentStatus === "DEPOSITED" ? balanceDueVnd(b.amount) : 0;

        return (
          <CardRoot key={b.id} {...userBookingCardProps}>
            <CardBody>
              <Stack gap={2}>
                <HStack justify="space-between" align="flex-start" gap={2}>
                  <Text fontWeight="semibold">{b.bookingCode}</Text>
                  <Badge
                    colorPalette={bookingStatusColor(b.status)}
                    variant="subtle"
                  >
                    {bookingStatusLabel(b.status)}
                  </Badge>
                </HStack>
                <HStack justify="space-between" align="baseline" gap={2} w="full">
                  <Text fontSize="sm" flex="1" minW={0}>
                    {cameraDisplayName(b.camera.brand, b.camera.name)}
                  </Text>
                  {GUIDE_STATUSES.has(b.status) ? (
                    <Text
                      as="button"
                      {...inlineTextLinkProps}
                      flexShrink={0}
                      onClick={() =>
                        setGuideCamera({
                          id: b.camera.id,
                          name: cameraDisplayName(
                            b.camera.brand,
                            b.camera.name,
                          ),
                        })
                      }
                    >
                      Hướng dẫn sử dụng
                    </Text>
                  ) : null}
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  {formatBookingRange(b.startBookingDate, b.endBookingDate)}
                </Text>
                <HStack justify="space-between" fontSize="sm" w="full">
                  <Text>Thời gian: {slotLabelVi(b.slot)}</Text>
                  <Text fontSize="xs" color="fg.muted">
                    {slotTimeRangeLabel(b.slot)}
                  </Text>
                </HStack>
                <Text fontSize="sm" fontWeight="medium">
                  Tổng: {vnd.format(b.amount)}
                </Text>
                {balanceDue > 0 ? (
                  <Stack gap={1} align="flex-start">
                    <Text fontSize="sm" color="fg.muted">
                      Còn lại khi lấy máy:{" "}
                      <Text as="span" fontWeight="semibold" color={titleColor}>
                        {vnd.format(balanceDue)}
                      </Text>
                    </Text>
                    <Link
                      href={STORE_MAP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      {...inlineTextLinkProps}
                    >
                      Xem địa chỉ
                    </Link>
                  </Stack>
                ) : null}
                {b.status === "PENDING_PAYMENT" ? (
                  <HStack gap={2} w="full">
                    <IconButton
                      type="button"
                      size="sm"
                      variant="solid"
                      aria-label="Huỷ đơn"
                      {...cancelButtonProps}
                      loading={deletePendingId === b.id}
                      disabled={
                        deletePendingId !== null && deletePendingId !== b.id
                      }
                      onClick={() => void handleDeletePending(b)}
                    >
                      <TrashIcon />
                    </IconButton>
                    <Button
                      asChild
                      flex={1}
                      size="sm"
                      colorPalette={APP_COLOR_PALETTE}
                    >
                      <NextLink href={`/book/payment?bookingId=${b.id}`}>
                        Thanh toán cọc
                      </NextLink>
                    </Button>
                  </HStack>
                ) : null}
                {canModify ? (
                  <HStack gap={2} w="full">
                    <IconButton
                      type="button"
                      size="sm"
                      variant="solid"
                      aria-label="Huỷ đơn"
                      {...cancelButtonProps}
                      onClick={() => {
                        setCancelTarget(b);
                        setBankAccountInfo("");
                        setCancelError(null);
                      }}
                    >
                      <TrashIcon />
                    </IconButton>
                    <Button
                      flex={1}
                      size="sm"
                      colorPalette={APP_COLOR_PALETTE}
                      onClick={() =>
                        router.push(`/book?changeBookingId=${b.id}`)
                      }
                    >
                      Đổi lịch
                    </Button>
                  </HStack>
                ) : null}
              </Stack>
            </CardBody>
          </CardRoot>
        );
      })}

      <CameraTutorialDialog
        cameraId={guideCamera?.id ?? null}
        cameraName={guideCamera?.name}
        onClose={() => setGuideCamera(null)}
      />

      <DialogRoot
        open={!!cancelTarget}
        onOpenChange={(e) => {
          if (!e.open) closeCancelModal();
        }}
        lazyMount
        unmountOnExit
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="md" mx={4}>
            <DialogHeader>
              <DialogTitle color={titleColor}>Hủy đặt lịch</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <Stack gap={4}>
                {cancelTarget ? (
                  <Text fontSize="sm" color="fg.muted">
                    Đơn{" "}
                    <Text as="span" fontWeight="semibold" color="fg">
                      {cancelTarget.bookingCode}
                    </Text>
                    .{" "}
                    {cancelRefundEligible ? (
                      <>
                        Hủy trước hơn 24 giờ so với giờ lấy máy — bạn được
                        hoàn{" "}
                        <Text as="span" fontWeight="bold" color={titleColor}>
                          {vnd.format(BOOKING_CANCEL_REFUND_VND)}
                        </Text>{" "}
                        cọc (trừ phí giao dịch). Cửa hàng sẽ chuyển khoản sớm
                        nhất.
                      </>
                    ) : (
                      <>
                        Hủy trong vòng 24 giờ trước lấy máy —{" "}
                        <Text as="span" fontWeight="semibold" color="fg">
                          không hoàn cọc
                        </Text>
                        .
                      </>
                    )}
                  </Text>
                ) : null}
                {cancelError ? (
                  <Text color="red.fg" fontSize="sm">
                    {cancelError}
                  </Text>
                ) : null}
                {cancelRefundEligible ? (
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Tài khoản ngân hàng nhận hoàn cọc
                    </Text>
                    <Textarea
                      placeholder="Số TK, ngân hàng, tên chủ TK…"
                      value={bankAccountInfo}
                      rows={4}
                      onChange={(e) => setBankAccountInfo(e.target.value)}
                      {...userFieldInputProps}
                    />
                  </Box>
                ) : null}
              </Stack>
            </DialogBody>
            <DialogFooter gap={2}>
              <Button {...userOutlineButtonProps} onClick={closeCancelModal}>
                Đóng
              </Button>
              <Button
                {...cancelButtonProps}
                loading={cancelSubmitting}
                disabled={cancelRefundEligible && !bankAccountInfo.trim()}
                onClick={() => void handleCancelSubmit()}
              >
                Xác nhận hủy
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Stack>
  );
}
