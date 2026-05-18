"use client";

import {
  Badge,
  Box,
  Button,
  CardBody,
  CardDescription,
  CardHeader,
  CardRoot,
  CardTitle,
  CheckboxControl,
  CheckboxHiddenInput,
  CheckboxLabel,
  CheckboxRoot,
  HStack,
  Input,
  Link,
  MenuContent,
  MenuItem,
  MenuItemText,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Portal,
  Spinner,
  Stack,
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableRoot,
  TableRow,
  TableScrollArea,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { slotLabelVi, slotTimeRangeLabel } from "@/lib/booking-status";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE, cardSurfaceProps } from "@/lib/app-theme";
import { toaster } from "@/lib/toaster";

type BookingCustomer = {
  id: string;
  name: string;
  phone: string;
};

type BookingCamera = {
  id: string;
  name: string;
  brand: string;
};

type Booking = {
  id: string;
  bookingCode: string;
  customerId: string;
  cameraId: string;
  startBookingDate: string;
  endBookingDate: string;
  slot: string;
  amount: number;
  note: string | null;
  shippingAddress: string | null;
  paymentStatus: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer: BookingCustomer;
  camera: BookingCamera;
};

const tableCellPad = { px: 4, py: 3 };

const PAGE_SIZE_OPTIONS = [10, 30, 50] as const;

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const bookingDateFmt = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
});

function formatBookingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return bookingDateFmt.format(d);
}

function paymentBadgeProps(
  s: string,
): { label: string; colorPalette: "gray" | "green" | "red" | "orange" } {
  switch (s) {
    case "PENDING":
      return { label: "Chưa thanh toán", colorPalette: "orange" };
    case "PAID":
      return { label: "Đã thanh toán", colorPalette: "green" };
    case "FAILED":
      return { label: "Thất bại", colorPalette: "red" };
    case "REFUNDED":
      return { label: "Hoàn tiền", colorPalette: "gray" };
    default:
      return { label: s, colorPalette: "gray" };
  }
}

function statusBadgeProps(
  s: string,
): {
  label: string;
  colorPalette: "gray" | "green" | "red" | "orange" | "ocean" | "purple";
} {
  switch (s) {
    case "PENDING_PAYMENT":
      return { label: "Chờ thanh toán", colorPalette: "orange" };
    case "CONFIRMED":
      return { label: "Chờ lấy máy", colorPalette: "purple" };
    case "RENTING":
      return { label: "Đang thuê", colorPalette: "ocean" };
    case "LATE_RETURN":
      return { label: "Trả trễ", colorPalette: "red" };
    case "COMPLETED":
      return { label: "Hoàn tất", colorPalette: "green" };
    case "PENDING_REFUND_CANCEL":
      return { label: "Chờ hoàn tiền hủy lịch", colorPalette: "orange" };
    case "PENDING_REFUND_CHANGE":
      return { label: "Chờ hoàn tiền thay đổi", colorPalette: "orange" };
    case "PENDING_CHANGE_PAYMENT":
      return { label: "Chờ chuyển thêm", colorPalette: "purple" };
    case "CANCELLED":
      return { label: "Đã hủy", colorPalette: "red" };
    case "REFUNDED":
      return { label: "Đã hoàn tiền", colorPalette: "green" };
    default:
      return { label: s, colorPalette: "gray" };
  }
}

/** Lọc theo trạng thái đơn (API `status`) */
type StatusFilter =
  | "ALL"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "RENTING"
  | "LATE_RETURN"
  | "COMPLETED"
  | "PENDING_REFUND_CANCEL"
  | "PENDING_REFUND_CHANGE"
  | "PENDING_CHANGE_PAYMENT"
  | "CANCELLED"
  | "REFUNDED";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { value: "CONFIRMED", label: "Chờ lấy máy" },
  { value: "RENTING", label: "Đang thuê" },
  { value: "LATE_RETURN", label: "Trả trễ" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "PENDING_REFUND_CANCEL", label: "Chờ hoàn tiền hủy lịch" },
  { value: "PENDING_REFUND_CHANGE", label: "Chờ hoàn tiền thay đổi" },
  { value: "PENDING_CHANGE_PAYMENT", label: "Chờ chuyển thêm" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "REFUNDED", label: "Đã hoàn tiền" },
];

type BookingStatusValue = Exclude<StatusFilter, "ALL">;

const BOOKING_STATUS_EDIT_OPTIONS = STATUS_FILTER_OPTIONS.filter(
  (o): o is { value: BookingStatusValue; label: string } => o.value !== "ALL",
);

type PaymentStatusValue = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

const BOOKING_PAYMENT_EDIT_OPTIONS: {
  value: PaymentStatusValue;
  label: string;
}[] = [
  { value: "PENDING", label: "Chưa thanh toán" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "FAILED", label: "Thất bại" },
  { value: "REFUNDED", label: "Hoàn tiền" },
];

/** Lọc theo `paymentStatus` từ API */
type PaymentStatusFilter = "ALL" | PaymentStatusValue;

const PAYMENT_FILTER_OPTIONS: { value: PaymentStatusFilter; label: string }[] =
  [
    { value: "ALL", label: "Tất cả" },
    ...BOOKING_PAYMENT_EDIT_OPTIONS,
  ];

type SearchField = "phone" | "name" | "bookingCode";

function normalizePhoneDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function bookingMatchesSearch(
  b: Booking,
  field: SearchField,
  rawQuery: string,
): boolean {
  const q = rawQuery.trim();
  if (q.length === 0) return true;
  switch (field) {
    case "phone": {
      const needle = normalizePhoneDigits(q);
      if (needle.length === 0) return true;
      return normalizePhoneDigits(b.customer.phone).includes(needle);
    }
    case "name":
      return b.customer.name.toLowerCase().includes(q.toLowerCase());
    case "bookingCode":
      return b.bookingCode.toLowerCase().includes(q.toLowerCase());
    default:
      return true;
  }
}

/** YYYY-MM-DD theo giờ local (trình duyệt) */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function bookingLocalDateKey(bookingIso: string): string {
  return toLocalDateKey(new Date(bookingIso));
}

function todayLocalDateKey(): string {
  return toLocalDateKey(new Date());
}

function BookingStatusMenuCell({
  booking,
  saving,
  onChangeStatus,
  onMenuOpenChange,
}: {
  booking: Booking;
  saving: boolean;
  onChangeStatus: (id: string, status: BookingStatusValue) => void;
  onMenuOpenChange: (open: boolean) => void;
}) {
  const st = statusBadgeProps(booking.status);
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
          aria-label={`Trạng thái: ${st.label}. Nhấn để đổi trạng thái`}
        >
          {saving ? <Spinner size="xs" /> : null}
          <Badge variant="subtle" colorPalette={st.colorPalette}>
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

function BookingPaymentMenuCell({
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

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [paymentSavingId, setPaymentSavingId] = useState<string | null>(null);
  const [searchField, setSearchField] = useState<SearchField>("phone");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDateKey, setFilterDateKey] = useState(todayLocalDateKey);
  /** Bật = không lọc theo ngày, hiển thị mọi đơn (theo các bộ lọc khác). */
  const [showAllDates, setShowAllDates] = useState(true);
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatusFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toaster.success({ title: "Đã sao chép" });
    } catch {
      toaster.error({
        title: "Không sao chép được",
        description: "Trình duyệt có thể đã chặn clipboard.",
      });
    }
  }, []);

  const handleBookingStatusChange = useCallback(
    async (id: string, status: BookingStatusValue) => {
      setPatchError(null);
      setStatusSavingId(id);
      try {
        const res = await fetch(
          `${apiBase()}/api/bookings/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || res.statusText);
        }
        const updated = (await res.json()) as Booking;
        setBookings((prev) =>
          prev?.map((row) => (row.id === id ? updated : row)) ?? null,
        );
      } catch (e) {
        setPatchError(
          e instanceof Error
            ? e.message
            : "Không cập nhật được trạng thái đơn.",
        );
      } finally {
        setStatusSavingId(null);
      }
    },
    [],
  );

  const handleBookingPaymentChange = useCallback(
    async (id: string, paymentStatus: PaymentStatusValue) => {
      setPatchError(null);
      setPaymentSavingId(id);
      try {
        const res = await fetch(
          `${apiBase()}/api/bookings/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus }),
          },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || res.statusText);
        }
        const updated = (await res.json()) as Booking;
        setBookings((prev) =>
          prev?.map((row) => (row.id === id ? updated : row)) ?? null,
        );
      } catch (e) {
        setPatchError(
          e instanceof Error
            ? e.message
            : "Không cập nhật được trạng thái thanh toán.",
        );
      } finally {
        setPaymentSavingId(null);
      }
    },
    [],
  );

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      if (
        !showAllDates &&
        bookingLocalDateKey(b.startBookingDate) !== filterDateKey
      ) {
        return false;
      }
      if (statusFilter !== "ALL" && b.status !== statusFilter) {
        return false;
      }
      if (
        paymentStatusFilter !== "ALL" &&
        b.paymentStatus !== paymentStatusFilter
      ) {
        return false;
      }
      return bookingMatchesSearch(b, searchField, searchQuery);
    });
  }, [
    bookings,
    searchField,
    searchQuery,
    filterDateKey,
    showAllDates,
    statusFilter,
    paymentStatusFilter,
  ]);

  const totalFiltered = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);

  const pagedBookings = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, clampedPage, pageSize]);

  const loadBookings = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/api/bookings`, {
        credentials: "include",
        signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const json = (await res.json()) as Booking[];
      if (!signal?.aborted) setBookings(json);
    } catch (e) {
      if (signal?.aborted) return;
      setBookings(null);
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void loadBookings(ac.signal);
    return () => ac.abort();
  }, [loadBookings]);

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardHeader>
          <HStack
            justify="space-between"
            align="center"
            gap={4}
            flexWrap="wrap"
            rowGap={3}
          >
            <HStack gap={3} align="center" flexWrap="wrap">
              <CardTitle textStyle="2xl">Đơn thuê</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                colorPalette={APP_COLOR_PALETTE}
                loading={loading}
                onClick={() => void loadBookings()}
                aria-label="Làm mới danh sách đơn thuê"
              >
                Làm mới
              </Button>
            </HStack>
            {bookings !== null ? (
              <HStack gap={2} flexWrap="wrap" justify="flex-end">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    !showAllDates &&
                    filterDateKey === todayLocalDateKey() &&
                    statusFilter === "ALL" &&
                    paymentStatusFilter === "ALL" &&
                    searchQuery.trim() === ""
                      ? "solid"
                      : "outline"
                  }
                  colorPalette={APP_COLOR_PALETTE}
                  onClick={() => {
                    setShowAllDates(false);
                    setFilterDateKey(todayLocalDateKey());
                    setStatusFilter("ALL");
                    setPaymentStatusFilter("ALL");
                    setSearchQuery("");
                    setPage(1);
                  }}
                >
                  Đơn thuê hôm nay
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    showAllDates &&
                    statusFilter === "RENTING" &&
                    paymentStatusFilter === "ALL" &&
                    searchQuery.trim() === ""
                      ? "solid"
                      : "outline"
                  }
                  colorPalette={APP_COLOR_PALETTE}
                  onClick={() => {
                    setShowAllDates(true);
                    setStatusFilter("RENTING");
                    setPaymentStatusFilter("ALL");
                    setSearchQuery("");
                    setPage(1);
                  }}
                >
                  Đơn đang thuê
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    showAllDates &&
                    statusFilter === "ALL" &&
                    paymentStatusFilter === "PENDING" &&
                    searchQuery.trim() === ""
                      ? "solid"
                      : "outline"
                  }
                  colorPalette={APP_COLOR_PALETTE}
                  onClick={() => {
                    setShowAllDates(true);
                    setStatusFilter("ALL");
                    setPaymentStatusFilter("PENDING");
                    setSearchQuery("");
                    setPage(1);
                  }}
                >
                  Đơn thuê chưa thanh toán
                </Button>
              </HStack>
            ) : null}
          </HStack>
        </CardHeader>
        <CardBody>
          <Stack gap={4} w="full">
            <CardDescription>
              Danh sách đơn từ{" "}
              <Text as="span" fontWeight="semibold">
                GET /api/bookings
              </Text>
              .
            </CardDescription>
            {bookings && bookings.length > 0 ? (
              <HStack
                w="full"
                align="flex-start"
                justify="space-between"
                gap={4}
                flexWrap={{ base: "wrap", lg: "nowrap" }}
              >
                <HStack
                  gap={4}
                  align="flex-start"
                  flexWrap="wrap"
                  flexShrink={0}
                >
                  <Stack gap={2} align="flex-start">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="fg.muted"
                    >
                      Ngày thuê
                    </Text>
                    <Input
                      type="date"
                      size="sm"
                      w="auto"
                      minW="11rem"
                      bg="white"
                      borderWidth="1px"
                      borderColor="gray.200"
                      value={filterDateKey}
                      onChange={(e) => setFilterDateKey(e.target.value)}
                      disabled={showAllDates}
                      opacity={showAllDates ? 0.55 : 1}
                      aria-label="Lọc theo ngày thuê"
                      _focusVisible={{
                        borderColor: "ocean.500",
                      }}
                    />
                    <CheckboxRoot
                      size="sm"
                      colorPalette={APP_COLOR_PALETTE}
                      checked={showAllDates}
                      aria-label="Tất cả ngày — bỏ lọc theo ngày thuê"
                      onCheckedChange={({ checked }) =>
                        setShowAllDates(checked === true)
                      }
                    >
                      <CheckboxHiddenInput />
                      <CheckboxControl
                        bg="white"
                        borderColor="gray.300"
                        _checked={{
                          bg: "colorPalette.solid",
                          borderColor: "colorPalette.solid",
                          color: "colorPalette.contrast",
                        }}
                        _indeterminate={{
                          bg: "colorPalette.solid",
                          borderColor: "colorPalette.solid",
                          color: "colorPalette.contrast",
                        }}
                      />
                      <CheckboxLabel fontSize="sm" color="fg.muted">
                        Tất cả ngày
                      </CheckboxLabel>
                    </CheckboxRoot>
                  </Stack>
                  <Stack gap={2} align="flex-start" minW="11rem">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="fg.muted"
                    >
                      Thanh toán
                    </Text>
                    <NativeSelectRoot size="sm" w="full" minW="11rem">
                      <NativeSelectField
                        value={paymentStatusFilter}
                        bg="white"
                        borderWidth="1px"
                        borderColor="gray.200"
                        onChange={(e) =>
                          setPaymentStatusFilter(
                            e.target.value as PaymentStatusFilter,
                          )
                        }
                        aria-label="Lọc theo trạng thái thanh toán"
                      >
                        {PAYMENT_FILTER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                  </Stack>
                  <Stack gap={2} align="flex-start" minW="11rem">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="fg.muted"
                    >
                      Trạng thái đơn
                    </Text>
                    <NativeSelectRoot size="sm" w="full" minW="11rem">
                      <NativeSelectField
                        value={statusFilter}
                        bg="white"
                        borderWidth="1px"
                        borderColor="gray.200"
                        onChange={(e) =>
                          setStatusFilter(e.target.value as StatusFilter)
                        }
                        aria-label="Lọc theo trạng thái đơn"
                      >
                        {STATUS_FILTER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                  </Stack>
                </HStack>
                <Stack
                  gap={2}
                  align={{ base: "stretch", md: "flex-end" }}
                  flex="1"
                  minW={0}
                  maxW={{ lg: "36rem" }}
                  w={{ base: "full", lg: "auto" }}
                  ml={{ lg: "auto" }}
                >
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color="fg.muted"
                    textAlign={{ base: "left", md: "right" }}
                    w="full"
                  >
                    Tìm kiếm
                  </Text>
                  <HStack
                    gap={2}
                    flexWrap="nowrap"
                    align="stretch"
                    justify="flex-end"
                    w="full"
                    maxW="100%"
                  >
                    <NativeSelectRoot
                      size="sm"
                      w="11rem"
                      flexShrink={0}
                    >
                      <NativeSelectField
                        value={searchField}
                        bg="white"
                        borderWidth="1px"
                        borderColor="gray.200"
                        onChange={(e) =>
                          setSearchField(e.target.value as SearchField)
                        }
                      >
                        <option value="bookingCode">Mã đơn</option>
                        <option value="name">Tên khách</option>
                        <option value="phone">Số điện thoại</option>
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                    <Input
                      flex="1"
                      minW={0}
                      size="sm"
                      bg="white"
                      borderWidth="1px"
                      borderColor="gray.200"
                      _focusVisible={{
                        borderColor: "ocean.500",
                      }}
                      placeholder={
                        searchField === "phone"
                          ? "Ví dụ: 0901…"
                          : searchField === "name"
                            ? "Nhập tên khách…"
                            : "Ví dụ: DH-20260516-A3F2"
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Từ khóa tìm kiếm"
                    />
                  </HStack>
                </Stack>
              </HStack>
            ) : null}
          </Stack>
        </CardBody>
      </CardRoot>

      {error ? (
        <CardRoot borderWidth="1px" borderColor="red.300" bg="red.50">
          <CardBody>
            <Text color="red.fg" fontWeight="medium">
              {error}
            </Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {loading && bookings === null && !error ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Text>Đang tải danh sách…</Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {bookings && bookings.length === 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Text>Chưa có đơn thuê nào.</Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {bookings && bookings.length > 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody p={0}>
            {filteredBookings.length === 0 ? (
              <Box px={4} py={8}>
                <Text color="fg.muted" textAlign="center">
                  {showAllDates
                    ? "Không có đơn phù hợp bộ lọc trạng thái hoặc tìm kiếm."
                    : "Không có đơn trong ngày đã chọn, bộ lọc trạng thái đơn/thanh toán hoặc khớp tìm kiếm."}
                </Text>
              </Box>
            ) : (
              <Stack gap={3}>
                {patchError ? (
                  <Box px={4} pt={2}>
                    <Text color="red.fg" fontSize="sm" fontWeight="medium">
                      {patchError}
                    </Text>
                  </Box>
                ) : null}
                <TableScrollArea rounded="l2">
              <TableRoot size="sm" native>
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader {...tableCellPad}>
                      Mã đơn
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>
                      Ngày thuê
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>Buổi</TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>Khách</TableColumnHeader>
                    <TableColumnHeader maxW="14rem" {...tableCellPad}>
                      Địa chỉ
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>Máy</TableColumnHeader>
                    <TableColumnHeader {...tableCellPad} textAlign="end">
                      Số tiền
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>
                      Thanh toán
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>
                      Trạng thái
                    </TableColumnHeader>
                    <TableColumnHeader maxW="12rem" {...tableCellPad}>
                      Ghi chú
                    </TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedBookings.map((b) => {
                    return (
                      <TableRow key={b.id}>
                        <TableCell fontWeight="medium" {...tableCellPad}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            h="auto"
                            minH={0}
                            px={1}
                            py={0}
                            fontWeight="medium"
                            justifyContent="flex-start"
                            title="Nhấn để sao chép mã đơn"
                            _hover={{ textDecoration: "underline" }}
                            onClick={() =>
                              void copyToClipboard(b.bookingCode)
                            }
                          >
                            {b.bookingCode}
                          </Button>
                        </TableCell>
                        <TableCell whiteSpace="nowrap" {...tableCellPad}>
                          <Stack gap={0} align="flex-start">
                            <Text fontSize="sm">
                              {formatBookingDate(b.startBookingDate)}
                            </Text>
                            {bookingLocalDateKey(b.startBookingDate) !==
                            bookingLocalDateKey(b.endBookingDate) ? (
                              <Text fontSize="sm" color="fg.muted">
                                Trả: {formatBookingDate(b.endBookingDate)}
                              </Text>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell {...tableCellPad}>
                          <Stack gap={0} align="flex-start">
                            <Text fontSize="sm">{slotLabelVi(b.slot)}</Text>
                            <Text fontSize="xs" color="fg.muted">
                              {slotTimeRangeLabel(b.slot)}
                            </Text>
                          </Stack>
                        </TableCell>
                        <TableCell {...tableCellPad}>
                          <Stack gap={1} align="flex-start" w="full">
                            <Link
                              asChild
                              fontWeight="medium"
                              colorPalette={APP_COLOR_PALETTE}
                              _hover={{ textDecoration: "underline" }}
                            >
                              <NextLink
                                href={`/admin/customers/${encodeURIComponent(b.customer.id)}`}
                                aria-label={`Chi tiết khách ${b.customer.name}`}
                              >
                                {b.customer.name}
                              </NextLink>
                            </Link>
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              h="auto"
                              minH={0}
                              px={1}
                              py={0}
                              fontSize="sm"
                              color="fg.muted"
                              fontWeight="normal"
                              justifyContent="flex-start"
                              title="Nhấn để sao chép số điện thoại"
                              _hover={{ textDecoration: "underline" }}
                              onClick={() =>
                                void copyToClipboard(b.customer.phone)
                              }
                            >
                              {b.customer.phone}
                            </Button>
                          </Stack>
                        </TableCell>
                        <TableCell maxW="14rem" {...tableCellPad}>
                          {b.shippingAddress?.trim() ? (
                            <Text
                              fontSize="sm"
                              lineClamp={3}
                              title={b.shippingAddress.trim()}
                              whiteSpace="pre-wrap"
                            >
                              {b.shippingAddress.trim()}
                            </Text>
                          ) : (
                            <Text fontSize="sm" color="fg.muted">
                              Tự lấy
                            </Text>
                          )}
                        </TableCell>
                        <TableCell {...tableCellPad}>
                          <Text fontSize="sm" color="fg.muted">
                            {b.camera.brand}
                          </Text>
                          <Text fontWeight="medium">{b.camera.name}</Text>
                        </TableCell>
                        <TableCell {...tableCellPad} textAlign="end">
                          {vnd.format(b.amount)}
                        </TableCell>
                        <TableCell {...tableCellPad}>
                          <BookingPaymentMenuCell
                            booking={b}
                            saving={
                              paymentSavingId === b.id ||
                              statusSavingId === b.id
                            }
                            onChangePaymentStatus={handleBookingPaymentChange}
                            onMenuOpenChange={(open) => {
                              if (open) setPatchError(null);
                            }}
                          />
                        </TableCell>
                        <TableCell {...tableCellPad}>
                          <BookingStatusMenuCell
                            booking={b}
                            saving={
                              statusSavingId === b.id ||
                              paymentSavingId === b.id
                            }
                            onChangeStatus={handleBookingStatusChange}
                            onMenuOpenChange={(open) => {
                              if (open) setPatchError(null);
                            }}
                          />
                        </TableCell>
                        <TableCell maxW="12rem" {...tableCellPad}>
                          {b.note ? (
                            <Text
                              lineClamp={3}
                              title={b.note}
                              whiteSpace="pre-wrap"
                            >
                              {b.note}
                            </Text>
                          ) : (
                            <Text color="fg.muted">—</Text>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </TableRoot>
            </TableScrollArea>
                <HStack
                  px={4}
                  py={3}
                  flexWrap="wrap"
                  gap={3}
                  justify="space-between"
                  align="center"
                  borderTopWidth="1px"
                  borderTopColor="gray.200"
                  bg="white"
                >
                  <Text fontSize="sm" color="fg.muted">
                    {totalFiltered === 0
                      ? "0 đơn"
                      : `Hiển thị ${(clampedPage - 1) * pageSize + 1}–${Math.min(clampedPage * pageSize, totalFiltered)} / ${totalFiltered} đơn`}
                  </Text>
                  <HStack gap={2} flexWrap="wrap" align="center">
                    <Text fontSize="sm" color="fg.muted" flexShrink={0}>
                      Mỗi trang
                    </Text>
                    <NativeSelectRoot size="sm" w="auto" minW="5.5rem">
                      <NativeSelectField
                        value={String(pageSize)}
                        bg="white"
                        borderWidth="1px"
                        borderColor="gray.200"
                        aria-label="Số đơn mỗi trang"
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                      >
                        {PAGE_SIZE_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={clampedPage <= 1}
                      onClick={() => setPage(clampedPage - 1)}
                    >
                      Trước
                    </Button>
                    <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap">
                      Trang {clampedPage} / {totalPages}
                    </Text>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={clampedPage >= totalPages}
                      onClick={() => setPage(clampedPage + 1)}
                    >
                      Sau
                    </Button>
                  </HStack>
                </HStack>
              </Stack>
            )}
          </CardBody>
        </CardRoot>
      ) : null}
    </Stack>
  );
}
