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
  cameraReadinessBadgeProps,
  formatBookingUsageDetailHome,
} from "@/lib/booking-status";
import {
  fetchRangeAvailability,
  type BookingSlot,
  type CameraBrand,
} from "@/lib/booking-api";
import {
  formatPickupAtHomeDisplay,
  isoToCalendarDateKey,
  pickupIsoIsYesterdayTodayOrTomorrowVn,
} from "@/lib/datetime-vn";
import {
  BOOKING_CANCEL_REFUND_VND,
  balanceDueVnd,
  isCancelRefundEligible,
} from "@/lib/booking-payment";
import { BRAND_LABEL } from "@/lib/camera-brands";
import { lensDisplayLabel } from "@/lib/lens-step";
import { getSession, type CustomerSession } from "@/lib/customer-session";
import {
  APP_COLOR_PALETTE,
  mutedAccentColor,
  titleColor,
  userBookingCardProps,
  userFieldInputProps,
  userOutlineButtonProps,
  userWarningNoteProps,
  userWarningNoteTextProps,
} from "@/lib/user-theme";
import { getStoreMapUrl } from "@/lib/site-config";

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

const PencilIcon = createIcon({
  displayName: "PencilIcon",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
    />
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
  /** null = đang kiểm tra; true/false = còn/hết chỗ cho cọc */
  const [depositSlotAvailable, setDepositSlotAvailable] = useState<
    Record<string, boolean | null>
  >({});

  const cancelRefundEligible = useMemo(() => {
    if (!cancelTarget) return false;
    return isCancelRefundEligible(cancelTarget.startBookingDate);
  }, [cancelTarget]);

  const loadBookings = useCallback(async (phone: string) => {
    setError(null);
    try {
      const list = await fetchMyBookings(phone);
      setBookings(list);

      const pending = list.filter((b) => b.status === "PENDING_PAYMENT");
      if (pending.length === 0) {
        setDepositSlotAvailable({});
        return;
      }
      setDepositSlotAvailable(
        Object.fromEntries(pending.map((b) => [b.id, null])),
      );

      const results = await Promise.all(
        pending.map(async (b) => {
          const startDate = isoToCalendarDateKey(b.startBookingDate);
          const endDate = isoToCalendarDateKey(b.endBookingDate);
          if (!startDate || !endDate) {
            return { id: b.id, available: false as const };
          }
          try {
            const r = await fetchRangeAvailability(
              b.camera.id,
              startDate,
              endDate,
              b.slot as BookingSlot,
              b.id,
            );
            return { id: b.id, available: r.available };
          } catch {
            return { id: b.id, available: false as const };
          }
        }),
      );
      setDepositSlotAvailable(
        Object.fromEntries(results.map((r) => [r.id, r.available])),
      );
    } catch (e) {
      setBookings(null);
      setDepositSlotAvailable({});
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

  useEffect(() => {
    const phone = session?.phone;
    if (!phone) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadBookings(phone);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [session?.phone, loadBookings]);

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

      <HStack justify="space-between" align="center" gap={2} w="full">
        <Text fontWeight="semibold" color={titleColor}>
          Đơn đặt lịch của bạn
        </Text>
        <Link
          href={getStoreMapUrl()}
          target="_blank"
          rel="noopener noreferrer"
          flexShrink={0}
          {...inlineTextLinkProps}
        >
          Xem địa chỉ
        </Link>
      </HStack>

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
        const showCameraReadiness =
          b.status === "CONFIRMED" &&
          b.cameraReady != null &&
          pickupIsoIsYesterdayTodayOrTomorrowVn(
            b.pickupAt ?? b.startBookingDate,
          );
        const readinessBadge = showCameraReadiness
          ? cameraReadinessBadgeProps(b.cameraReady === true)
          : null;

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
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  Ống kính:{" "}
                  <Text as="span" fontWeight="medium" color={titleColor}>
                    {lensDisplayLabel(b.lens)}
                  </Text>
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Sử dụng:{" "}
                  <Text
                    as="span"
                    fontWeight="medium"
                    color={titleColor}
                  >
                    {formatBookingUsageDetailHome(
                      b.startBookingDate,
                      b.endBookingDate,
                      b.slot,
                      b.returnNextMorning,
                    )}
                  </Text>
                </Text>
                
                {b.pickupAt ? (
                  <Stack gap={0.5} align="stretch">
                    <Text fontSize="sm" color="fg.muted">
                      Nhận máy:{" "}
                      <Text
                        as="span"
                        fontWeight="medium"
                        color={titleColor}
                      >
                        {formatPickupAtHomeDisplay(b.pickupAt)}
                      </Text>
                    </Text>
                    {readinessBadge ? (
                      <HStack justify="flex-end" w="full">
                        <Badge
                          variant="subtle"
                          colorPalette={readinessBadge.colorPalette}
                          flexShrink={0}
                        >
                          {readinessBadge.label}
                        </Badge>
                      </HStack>
                    ) : null}
                    {showCameraReadiness && b.cameraReady === false ? (
                      <Box {...userWarningNoteProps}>
                        <Text {...userWarningNoteTextProps}>
                          Hiện tại máy chưa có sẵn, do có bạn khác đang trong thời gian thuê. Xin hãy kiểm tra trạng thái sẵn sàng trước khi tới nhận máy.
                        </Text>
                      </Box>
                    ) : null}
                    <Box {...userWarningNoteProps}>
                      <Stack gap={1} align="stretch">
                        <Text {...userWarningNoteTextProps}>
                          Lưu ý: Xin hãy mang theo CCCD bảng gốc hoặc VnID và đọc sđt đã đăng kí khi nhận máy.
                        </Text>
                        <Text {...userWarningNoteTextProps}>
                          Vui lòng sạc pin sau khi nhận máy khoảng 20 phút để sử dụng.
                        </Text>
                      </Stack>
                    </Box>
                  </Stack>
                ) : null}
                <Text fontSize="sm" mt={2} fontWeight="medium">
                  Tổng: {vnd.format(b.amount)}
                </Text>
                {balanceDue > 0 ? (
                  <HStack justify="space-between" align="center" gap={2} w="full">
                    <Text fontSize="sm" color="fg.muted" flex="1" minW={0}>
                      Còn lại khi lấy máy:{" "}
                      <Text as="span" fontWeight="semibold" color={titleColor}>
                        {vnd.format(balanceDue)}
                      </Text>
                    </Text>
                    <Link
                      href={getStoreMapUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      flexShrink={0}
                      {...inlineTextLinkProps}
                    >
                      Xem địa chỉ
                    </Link>
                  </HStack>
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
                    <IconButton
                      type="button"
                      size="sm"
                      variant="solid"
                      colorPalette={APP_COLOR_PALETTE}
                      aria-label={`Sửa đơn ${b.bookingCode}`}
                      disabled={deletePendingId !== null}
                      onClick={() =>
                        router.push(`/book?editBookingId=${b.id}`)
                      }
                    >
                      <PencilIcon />
                    </IconButton>
                    {depositSlotAvailable[b.id] === true ? (
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
                    ) : (
                      <Button
                        flex={1}
                        size="sm"
                        colorPalette={
                          depositSlotAvailable[b.id] === false
                            ? "gray"
                            : APP_COLOR_PALETTE
                        }
                        disabled
                      >
                        {depositSlotAvailable[b.id] === false
                          ? "Hết chỗ"
                          : "Đang kiểm tra…"}
                      </Button>
                    )}
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
                      Thay đổi
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
