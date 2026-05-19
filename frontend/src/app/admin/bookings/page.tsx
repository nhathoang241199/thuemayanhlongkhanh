"use client";

import {
  Badge,
  Box,
  Button,
  createIcon,
  CardBody,
  IconButton,
  CardDescription,
  CardHeader,
  CardRoot,
  CardTitle,
  CheckboxControl,
  CheckboxHiddenInput,
  CheckboxLabel,
  CheckboxRoot,
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
  Textarea,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { MonthCalendar } from "@/components/booking/month-calendar";
import {
  getQuickAdvancePatch,
  quickAdvanceToastMessages,
} from "@/lib/admin-booking-quick-advance";
import { identifyCustomer } from "@/lib/api";
import {
  dayCountInclusive,
  fetchCalendarMonth,
  type CalendarDay,
} from "@/lib/booking-api";
import {
  datetimeLocalToIso,
  isoToCalendarDateKey,
  isoToDatetimeLocal,
  slotBookingRangeToIso,
} from "@/lib/datetime-vn";
import { slotLabelVi, slotTimeRangeLabel } from "@/lib/booking-status";
import type { BookingSlot } from "@/lib/booking-api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BRAND_LABEL } from "@/lib/camera-brands";
import { apiBase } from "@/lib/api-base";
import {
  APP_COLOR_PALETTE,
  cardSurfaceProps,
  fieldInputProps,
  titleColor,
} from "@/lib/app-theme";
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
  pickupAt: string | null;
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

const RefreshIcon = createIcon({
  displayName: "RefreshIcon",
  path: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 1 1-2.64-6.36"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 3v6h-6"
      />
    </>
  ),
});

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

const ChevronRightIcon = createIcon({
  displayName: "ChevronRightIcon",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 18l6-6-6-6"
    />
  ),
});

type AdminCustomerOption = { id: string; name: string; phone: string };
type AdminCameraOption = { id: string; brand: string; name: string };

const BOOKING_SLOT_OPTIONS = [
  "FULL_DAY",
  "MORNING",
  "AFTERNOON",
  "EVENING",
] as const;

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const vnDateTimeZone = "Asia/Ho_Chi_Minh";

const bookingDateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: vnDateTimeZone,
});

const pickupAtTableFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: vnDateTimeZone,
});

function formatBookingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return bookingDateFmt.format(d);
}

function formatPickupAtTable(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return pickupAtTableFmt.format(d);
}

function paymentBadgeProps(
  s: string,
): {
  label: string;
  colorPalette: "gray" | "green" | "red" | "orange" | "ocean" | "cerulean";
} {
  switch (s) {
    case "PENDING":
      return { label: "Chưa cọc", colorPalette: "orange" };
    case "DEPOSITED":
      return { label: "Đã cọc", colorPalette: "cerulean" };
    case "PAID":
      return { label: "Đã thanh toán", colorPalette: "green" };
    case "REFUNDED":
      return { label: "Đã hoàn tiền", colorPalette: "gray" };
    default:
      return { label: s, colorPalette: "gray" };
  }
}

function statusBadgeProps(
  s: string,
): {
  label: string;
  colorPalette:
    | "gray"
    | "green"
    | "red"
    | "orange"
    | "ocean"
    | "cerulean"
    | "purple";
} {
  switch (s) {
    case "PENDING_PAYMENT":
      return { label: "Chờ cọc", colorPalette: "orange" };
    case "CONFIRMED":
      return { label: "Chờ lấy máy", colorPalette: "purple" };
    case "RENTING":
      return { label: "Đang thuê", colorPalette: "cerulean" };
    case "LATE_RETURN":
      return { label: "Trả trễ", colorPalette: "red" };
    case "COMPLETED":
      return { label: "Hoàn tất", colorPalette: "green" };
    case "PENDING_REFUND_CANCEL":
      return { label: "Chờ hoàn tiền", colorPalette: "orange" };
    case "CANCELLED":
      return { label: "Đã hủy", colorPalette: "red" };
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
  | "CANCELLED";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING_PAYMENT", label: "Chờ cọc" },
  { value: "CONFIRMED", label: "Chờ lấy máy" },
  { value: "RENTING", label: "Đang thuê" },
  { value: "LATE_RETURN", label: "Trả trễ" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "PENDING_REFUND_CANCEL", label: "Chờ hoàn tiền" },
  { value: "CANCELLED", label: "Đã hủy" },
];

type BookingStatusValue = Exclude<StatusFilter, "ALL">;

const BOOKING_STATUS_EDIT_OPTIONS = STATUS_FILTER_OPTIONS.filter(
  (o): o is { value: BookingStatusValue; label: string } => o.value !== "ALL",
);

type PaymentStatusValue =
  | "PENDING"
  | "DEPOSITED"
  | "PAID"
  | "REFUNDED";

const BOOKING_PAYMENT_EDIT_OPTIONS: {
  value: PaymentStatusValue;
  label: string;
}[] = [
  { value: "PENDING", label: "Chưa cọc" },
  { value: "DEPOSITED", label: "Đã cọc" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "REFUNDED", label: "Đã hoàn tiền" },
];

type BookingEditForm = {
  bookingCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  cameraId: string;
  rangeStart: string;
  rangeEnd: string;
  startBookingDateLocal: string;
  endBookingDateLocal: string;
  slot: string;
  pickupAtLocal: string;
  amount: string;
  note: string;
  shippingAddress: string;
  paymentStatus: PaymentStatusValue;
  status: BookingStatusValue;
};

function nowCalendarYm(): { year: number; month: number } {
  const t = new Date();
  const vn = new Date(t.getTime() + 7 * 60 * 60 * 1000);
  return { year: vn.getUTCFullYear(), month: vn.getUTCMonth() + 1 };
}

function bookingToEditForm(b: Booking): BookingEditForm {
  return {
    bookingCode: b.bookingCode,
    customerId: b.customerId,
    customerName: b.customer.name,
    customerPhone: b.customer.phone,
    cameraId: b.cameraId,
    rangeStart: isoToCalendarDateKey(b.startBookingDate),
    rangeEnd: isoToCalendarDateKey(b.endBookingDate),
    startBookingDateLocal: isoToDatetimeLocal(b.startBookingDate),
    endBookingDateLocal: isoToDatetimeLocal(b.endBookingDate),
    slot: b.slot,
    pickupAtLocal: b.pickupAt ? isoToDatetimeLocal(b.pickupAt) : "",
    amount: String(b.amount),
    note: b.note ?? "",
    shippingAddress: b.shippingAddress ?? "",
    paymentStatus: b.paymentStatus as PaymentStatusValue,
    status: b.status as BookingStatusValue,
  };
}

function emptyBookingForm(): BookingEditForm {
  return {
    bookingCode: "",
    customerId: "",
    customerName: "",
    customerPhone: "",
    cameraId: "",
    rangeStart: "",
    rangeEnd: "",
    startBookingDateLocal: "",
    endBookingDateLocal: "",
    slot: "FULL_DAY",
    pickupAtLocal: "",
    amount: "",
    note: "",
    shippingAddress: "",
    paymentStatus: "PENDING",
    status: "PENDING_PAYMENT",
  };
}

/** Lọc theo `paymentStatus` từ API */
type PaymentStatusFilter = "ALL" | PaymentStatusValue;

const PAYMENT_FILTER_OPTIONS: { value: PaymentStatusFilter; label: string }[] =
  [
    { value: "ALL", label: "Tất cả" },
    ...BOOKING_PAYMENT_EDIT_OPTIONS,
  ];

type SearchField = "phone" | "name" | "bookingCode";

type CameraFilter = "ALL" | string;

function cameraFilterLabel(c: AdminCameraOption): string {
  const brand =
    BRAND_LABEL[c.brand as keyof typeof BRAND_LABEL] ?? c.brand;
  return `${brand} — ${c.name}`;
}

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
  const [deleteSavingId, setDeleteSavingId] = useState<string | null>(null);
  const [quickAdvanceSavingId, setQuickAdvanceSavingId] = useState<string | null>(
    null,
  );
  const [bookingFormMode, setBookingFormMode] = useState<"create" | "edit" | null>(
    null,
  );
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState<BookingEditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editCustomers, setEditCustomers] = useState<AdminCustomerOption[]>([]);
  const [editCameras, setEditCameras] = useState<AdminCameraOption[]>([]);
  const [editOptionsLoading, setEditOptionsLoading] = useState(false);
  const [createCalendarYm, setCreateCalendarYm] = useState(nowCalendarYm);
  const [createCalendarDays, setCreateCalendarDays] = useState<
    CalendarDay[] | undefined
  >(undefined);
  const [searchField, setSearchField] = useState<SearchField>("phone");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDateKey, setFilterDateKey] = useState(todayLocalDateKey);
  /** Bật = không lọc theo ngày, hiển thị mọi đơn (theo các bộ lọc khác). */
  const [showAllDates, setShowAllDates] = useState(true);
  const [filterByPickupTime, setFilterByPickupTime] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatusFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [cameraFilter, setCameraFilter] = useState<CameraFilter>("ALL");
  const [filterCameras, setFilterCameras] = useState<AdminCameraOption[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);

  const isRowSaving = useCallback(
    (id: string) =>
      statusSavingId === id ||
      paymentSavingId === id ||
      deleteSavingId === id ||
      quickAdvanceSavingId === id ||
      (editSaving && editingBooking?.id === id),
    [
      statusSavingId,
      paymentSavingId,
      deleteSavingId,
      quickAdvanceSavingId,
      editSaving,
      editingBooking?.id,
    ],
  );

  const patchBooking = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const res = await fetch(
        `${apiBase()}/api/bookings/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
      return updated;
    },
    [],
  );

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
        await patchBooking(id, { status });
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
    [patchBooking],
  );

  const handleBookingPaymentChange = useCallback(
    async (id: string, paymentStatus: PaymentStatusValue) => {
      setPatchError(null);
      setPaymentSavingId(id);
      try {
        await patchBooking(id, { paymentStatus });
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
    [patchBooking],
  );

  const handleQuickAdvance = useCallback(
    (booking: Booking) => {
      const patch = getQuickAdvancePatch(booking);
      if (!patch) return;
      void (async () => {
        setPatchError(null);
        setQuickAdvanceSavingId(booking.id);
        try {
          await patchBooking(booking.id, patch);
          for (const msg of quickAdvanceToastMessages(patch)) {
            toaster.success({ title: msg });
          }
        } catch (e) {
          setPatchError(
            e instanceof Error ? e.message : "Không cập nhật được đơn.",
          );
        } finally {
          setQuickAdvanceSavingId(null);
        }
      })();
    },
    [patchBooking],
  );

  const loadBookingFormOptions = useCallback(async (mode: "create" | "edit") => {
    setEditOptionsLoading(true);
    setEditError(null);
    try {
      const camRes = await fetch(`${apiBase()}/api/cameras`, {
        credentials: "include",
      });
      if (!camRes.ok) {
        throw new Error("Không tải được danh sách máy");
      }
      const cameras = (await camRes.json()) as AdminCameraOption[];
      setEditCameras(cameras);
      if (mode === "edit") {
        const custRes = await fetch(`${apiBase()}/api/customers`, {
          credentials: "include",
        });
        if (!custRes.ok) {
          throw new Error("Không tải được danh sách khách");
        }
        const customers = (await custRes.json()) as AdminCustomerOption[];
        setEditCustomers(customers);
      } else {
        setEditCustomers([]);
      }
    } catch (e) {
      setEditError(
        e instanceof Error ? e.message : "Không tải được dữ liệu form",
      );
    } finally {
      setEditOptionsLoading(false);
    }
  }, []);

  const openCreateBooking = useCallback(() => {
    setBookingFormMode("create");
    setEditingBooking(null);
    setEditForm(emptyBookingForm());
    setEditError(null);
    setCreateCalendarYm(nowCalendarYm());
    setCreateCalendarDays(undefined);
    void loadBookingFormOptions("create");
  }, [loadBookingFormOptions]);

  const openEditBooking = useCallback(
    (booking: Booking) => {
      setBookingFormMode("edit");
      setEditingBooking(booking);
      setEditForm(bookingToEditForm(booking));
      setEditError(null);
      void loadBookingFormOptions("edit");
    },
    [loadBookingFormOptions],
  );

  const closeBookingForm = useCallback(() => {
    setBookingFormMode(null);
    setEditingBooking(null);
    setEditForm(null);
    setEditError(null);
    setEditCustomers([]);
    setEditCameras([]);
    setCreateCalendarDays(undefined);
  }, []);

  const createFormDayCount = useMemo(() => {
    if (!editForm?.rangeStart || !editForm.rangeEnd) return 0;
    return dayCountInclusive(editForm.rangeStart, editForm.rangeEnd);
  }, [editForm]);

  const createFormForceFullDay = createFormDayCount >= 2;

  useEffect(() => {
    if (bookingFormMode !== "create" || !editForm?.cameraId) {
      setCreateCalendarDays(undefined);
      return;
    }
    void fetchCalendarMonth(
      editForm.cameraId,
      createCalendarYm.year,
      createCalendarYm.month,
    )
      .then((data) => setCreateCalendarDays(data.days))
      .catch(() => setCreateCalendarDays(undefined));
  }, [bookingFormMode, editForm?.cameraId, createCalendarYm]);

  const createBooking = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch(`${apiBase()}/api/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const created = (await res.json()) as Booking;
      setBookings((prev) => (prev ? [created, ...prev] : [created]));
      return created;
    },
    [],
  );

  const handleBookingFormSubmit = useCallback(() => {
    if (!bookingFormMode || !editForm) return;
    const amount = Number.parseInt(editForm.amount, 10);
    const isCreate = bookingFormMode === "create";

    if (isCreate) {
      if (!editForm.customerName.trim() || !editForm.customerPhone.trim()) {
        setEditError("Vui lòng nhập tên và số điện thoại khách.");
        return;
      }
      if (!editForm.cameraId) {
        setEditError("Vui lòng chọn máy ảnh.");
        return;
      }
      if (!editForm.rangeStart || !editForm.rangeEnd) {
        setEditError("Vui lòng chọn ngày sử dụng máy.");
        return;
      }
    } else {
      if (
        !editForm.bookingCode.trim() ||
        !editForm.customerId ||
        !editForm.cameraId
      ) {
        setEditError("Vui lòng điền đủ mã đơn, khách và máy.");
        return;
      }
      if (!editForm.startBookingDateLocal || !editForm.endBookingDateLocal) {
        setEditError("Vui lòng chọn ngày bắt đầu và kết thúc.");
        return;
      }
    }

    if (!Number.isFinite(amount) || amount < 0) {
      setEditError("Số tiền không hợp lệ.");
      return;
    }

    let startBookingDate: string;
    let endBookingDate: string;
    try {
      if (isCreate) {
        const slot = (
          createFormForceFullDay ? "FULL_DAY" : editForm.slot
        ) as BookingSlot;
        ({ startBookingDate, endBookingDate } = slotBookingRangeToIso(
          editForm.rangeStart,
          editForm.rangeEnd,
          slot,
        ));
      } else {
        startBookingDate = datetimeLocalToIso(editForm.startBookingDateLocal);
        endBookingDate = datetimeLocalToIso(editForm.endBookingDateLocal);
      }
    } catch {
      setEditError("Ngày/giờ thuê không hợp lệ.");
      return;
    }

    let pickupAt: string | null = null;
    if (editForm.pickupAtLocal.trim()) {
      try {
        pickupAt = datetimeLocalToIso(editForm.pickupAtLocal);
      } catch {
        setEditError("Thời gian nhận máy không hợp lệ.");
        return;
      }
    }

    const slot = (createFormForceFullDay && isCreate
      ? "FULL_DAY"
      : editForm.slot) as BookingSlot;

    void (async () => {
      setEditSaving(true);
      setEditError(null);
      try {
        let customerId = editForm.customerId;
        if (isCreate) {
          const identified = await identifyCustomer(
            editForm.customerName.trim(),
            editForm.customerPhone.trim(),
          );
          customerId = identified.customer.id;
        }

        const payload = {
          customerId,
          cameraId: editForm.cameraId,
          startBookingDate,
          endBookingDate,
          slot,
          pickupAt,
          amount,
          note: editForm.note.trim() || null,
          shippingAddress: editForm.shippingAddress.trim() || null,
          paymentStatus: editForm.paymentStatus,
          status: editForm.status,
        };

        if (isCreate) {
          const created = await createBooking(payload);
          toaster.success({ title: `Đã tạo đơn ${created.bookingCode}` });
        } else if (editingBooking) {
          const updated = await patchBooking(editingBooking.id, {
            bookingCode: editForm.bookingCode.trim(),
            ...payload,
          });
          toaster.success({ title: `Đã cập nhật đơn ${updated.bookingCode}` });
        }
        closeBookingForm();
      } catch (e) {
        setEditError(
          e instanceof Error
            ? e.message
            : isCreate
              ? "Không tạo được đơn."
              : "Không cập nhật được đơn.",
        );
      } finally {
        setEditSaving(false);
      }
    })();
  }, [
    bookingFormMode,
    editingBooking,
    editForm,
    patchBooking,
    createBooking,
    closeBookingForm,
    createFormForceFullDay,
  ]);

  const handleBookingDelete = useCallback((booking: Booking) => {
    if (
      !window.confirm(
        `Xóa đơn ${booking.bookingCode}? Thao tác không hoàn tác.`,
      )
    ) {
      return;
    }
    void (async () => {
      setPatchError(null);
      setDeleteSavingId(booking.id);
      try {
        const res = await fetch(
          `${apiBase()}/api/bookings/${encodeURIComponent(booking.id)}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || res.statusText);
        }
        setBookings((prev) => prev?.filter((row) => row.id !== booking.id) ?? null);
        toaster.success({ title: `Đã xóa đơn ${booking.bookingCode}` });
      } catch (e) {
        setPatchError(
          e instanceof Error ? e.message : "Không xóa được đơn thuê.",
        );
      } finally {
        setDeleteSavingId(null);
      }
    })();
  }, []);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    const filtered = bookings.filter((b) => {
      const dateKey = filterByPickupTime
        ? bookingLocalDateKey(b.pickupAt ?? b.startBookingDate)
        : bookingLocalDateKey(b.startBookingDate);
      if (!showAllDates && dateKey !== filterDateKey) {
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
      if (cameraFilter !== "ALL" && b.cameraId !== cameraFilter) {
        return false;
      }
      return bookingMatchesSearch(b, searchField, searchQuery);
    });
    if (filterByPickupTime && !showAllDates) {
      return [...filtered].sort((a, b) => {
        const ta = new Date(a.pickupAt ?? a.startBookingDate).getTime();
        const tb = new Date(b.pickupAt ?? b.startBookingDate).getTime();
        return ta - tb;
      });
    }
    return filtered;
  }, [
    bookings,
    searchField,
    searchQuery,
    filterDateKey,
    showAllDates,
    filterByPickupTime,
    statusFilter,
    paymentStatusFilter,
    cameraFilter,
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

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${apiBase()}/api/cameras`, {
          credentials: "include",
        });
        if (res.ok) {
          setFilterCameras((await res.json()) as AdminCameraOption[]);
        }
      } catch {
        setFilterCameras([]);
      }
    })();
  }, []);

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
              <IconButton
                type="button"
                size="sm"
                variant="solid"
                colorPalette={APP_COLOR_PALETTE}
                loading={loading}
                onClick={() => void loadBookings()}
                aria-label="Làm mới danh sách đơn thuê"
              >
                <RefreshIcon />
              </IconButton>
              <Button
                type="button"
                size="sm"
                variant="solid"
                colorPalette={APP_COLOR_PALETTE}
                onClick={openCreateBooking}
              >
                Thêm đơn
              </Button>
            </HStack>
            {bookings !== null ? (
              <HStack gap={2} flexWrap="wrap" justify="flex-end">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    showAllDates &&
                    statusFilter === "ALL" &&
                    paymentStatusFilter === "ALL" &&
                    cameraFilter === "ALL" &&
                    searchQuery.trim() === ""
                      ? "solid"
                      : "outline"
                  }
                  colorPalette={APP_COLOR_PALETTE}
                  onClick={() => {
                    setShowAllDates(true);
                    setStatusFilter("ALL");
                    setPaymentStatusFilter("ALL");
                    setCameraFilter("ALL");
                    setSearchQuery("");
                    setPage(1);
                  }}
                >
                  Tất cả đơn
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    !showAllDates &&
                    filterByPickupTime &&
                    filterDateKey === todayLocalDateKey() &&
                    statusFilter === "ALL" &&
                    paymentStatusFilter === "ALL" &&
                    cameraFilter === "ALL" &&
                    searchQuery.trim() === ""
                      ? "solid"
                      : "outline"
                  }
                  colorPalette={APP_COLOR_PALETTE}
                  onClick={() => {
                    setShowAllDates(false);
                    setFilterByPickupTime(true);
                    setFilterDateKey(todayLocalDateKey());
                    setStatusFilter("ALL");
                    setPaymentStatusFilter("ALL");
                    setCameraFilter("ALL");
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
                    cameraFilter === "ALL" &&
                    searchQuery.trim() === ""
                      ? "solid"
                      : "outline"
                  }
                  colorPalette={APP_COLOR_PALETTE}
                  onClick={() => {
                    setShowAllDates(true);
                    setStatusFilter("RENTING");
                    setPaymentStatusFilter("ALL");
                    setCameraFilter("ALL");
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
                    statusFilter === "PENDING_PAYMENT" &&
                    paymentStatusFilter === "ALL" &&
                    cameraFilter === "ALL" &&
                    searchQuery.trim() === ""
                      ? "solid"
                      : "outline"
                  }
                  colorPalette={APP_COLOR_PALETTE}
                  onClick={() => {
                    setShowAllDates(true);
                    setStatusFilter("PENDING_PAYMENT");
                    setPaymentStatusFilter("ALL");
                    setCameraFilter("ALL");
                    setSearchQuery("");
                    setPage(1);
                  }}
                >
                  Đơn chờ cọc
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
                      {filterByPickupTime ? "Ngày nhận máy" : "Ngày thuê"}
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
                      aria-label={
                        filterByPickupTime
                          ? "Lọc theo ngày nhận máy"
                          : "Lọc theo ngày thuê"
                      }
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
                    <CheckboxRoot
                      size="sm"
                      colorPalette={APP_COLOR_PALETTE}
                      checked={filterByPickupTime}
                      disabled={showAllDates}
                      aria-label="Lọc theo giờ nhận máy"
                      onCheckedChange={({ checked }) =>
                        setFilterByPickupTime(checked === true)
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
                      />
                      <CheckboxLabel fontSize="sm" color="fg.muted">
                        Lọc theo giờ nhận máy
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
                  <Stack gap={2} align="flex-start" minW="11rem">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="fg.muted"
                    >
                      Máy ảnh
                    </Text>
                    <NativeSelectRoot size="sm" w="full" minW="11rem">
                      <NativeSelectField
                        value={cameraFilter}
                        bg="white"
                        borderWidth="1px"
                        borderColor="gray.200"
                        onChange={(e) => {
                          setCameraFilter(e.target.value);
                          setPage(1);
                        }}
                        aria-label="Lọc theo máy ảnh"
                      >
                        <option value="ALL">Tất cả</option>
                        {filterCameras.map((c) => (
                          <option key={c.id} value={c.id}>
                            {cameraFilterLabel(c)}
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
                    ? "Không có đơn phù hợp bộ lọc trạng thái, máy ảnh hoặc tìm kiếm."
                    : "Không có đơn trong ngày đã chọn, bộ lọc trạng thái/thanh toán/máy hoặc khớp tìm kiếm."}
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
                      Ngày thuê
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>
                      Nhận máy
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
                    <TableColumnHeader {...tableCellPad} w="7.5rem">
                      Hành động
                    </TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedBookings.map((b) => {
                    return (
                      <TableRow key={b.id}>
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
                        <TableCell whiteSpace="nowrap" {...tableCellPad}>
                          <Text fontSize="sm">
                            {b.pickupAt
                              ? formatPickupAtTable(b.pickupAt)
                              : "—"}
                          </Text>
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
                          <Text fontSize="sm">{vnd.format(b.amount)}</Text>
                          {b.paymentStatus === "DEPOSITED" ? (
                            <Text fontSize="xs" color="fg.muted">
                              Còn lại:{" "}
                              {vnd.format(
                                Math.max(0, b.amount - 50_000),
                              )}
                            </Text>
                          ) : null}
                        </TableCell>
                        <TableCell {...tableCellPad}>
                          <BookingPaymentMenuCell
                            booking={b}
                            saving={isRowSaving(b.id)}
                            onChangePaymentStatus={handleBookingPaymentChange}
                            onMenuOpenChange={(open) => {
                              if (open) setPatchError(null);
                            }}
                          />
                        </TableCell>
                        <TableCell {...tableCellPad}>
                          <BookingStatusMenuCell
                            booking={b}
                            saving={isRowSaving(b.id)}
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
                        <TableCell {...tableCellPad}>
                          <HStack gap={1} justify="flex-end">
                            <IconButton
                              type="button"
                              size="sm"
                              variant="subtle"
                              colorPalette="green"
                              aria-label="Chuyển tiếp trạng thái"
                              disabled={
                                isRowSaving(b.id) ||
                                getQuickAdvancePatch(b) === null
                              }
                              loading={quickAdvanceSavingId === b.id}
                              onClick={() => handleQuickAdvance(b)}
                            >
                              <ChevronRightIcon />
                            </IconButton>
                            <IconButton
                              type="button"
                              size="sm"
                              variant="subtle"
                              colorPalette="blue"
                              aria-label={`Sửa đơn ${b.bookingCode}`}
                              disabled={isRowSaving(b.id)}
                              onClick={() => openEditBooking(b)}
                            >
                              <PencilIcon />
                            </IconButton>
                            <IconButton
                              type="button"
                              size="sm"
                              variant="subtle"
                              colorPalette="red"
                              aria-label={`Xóa đơn ${b.bookingCode}`}
                              loading={deleteSavingId === b.id}
                              disabled={isRowSaving(b.id)}
                              onClick={() => handleBookingDelete(b)}
                            >
                              <TrashIcon />
                            </IconButton>
                          </HStack>
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

      <DialogRoot
        open={bookingFormMode !== null}
        onOpenChange={(e) => {
          if (!e.open) closeBookingForm();
        }}
        lazyMount
        unmountOnExit
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="lg" mx={4}>
            <DialogHeader>
              <DialogTitle>
                {bookingFormMode === "create"
                  ? "Thêm đơn mới"
                  : `Sửa đơn ${editingBooking?.bookingCode ?? ""}`}
              </DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              {editOptionsLoading ? (
                <HStack py={6} justify="center">
                  <Spinner size="md" color="ocean.500" />
                </HStack>
              ) : editForm ? (
                <Stack gap={4}>
                  {editError ? (
                    <Text color="red.fg" fontSize="sm" fontWeight="medium">
                      {editError}
                    </Text>
                  ) : null}
                  {bookingFormMode === "edit" ? (
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1}>
                        Mã đơn
                      </Text>
                      <Input
                        value={editForm.bookingCode}
                        maxLength={64}
                        {...fieldInputProps}
                        onChange={(e) =>
                          setEditForm((f) =>
                            f ? { ...f, bookingCode: e.target.value } : f,
                          )
                        }
                      />
                    </Box>
                  ) : null}
                  {bookingFormMode === "create" ? (
                    <HStack gap={3} align="flex-start" flexWrap="wrap">
                      <Box flex="1" minW="10rem">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                          Tên khách
                        </Text>
                        <Input
                          value={editForm.customerName}
                          maxLength={120}
                          {...fieldInputProps}
                          onChange={(e) =>
                            setEditForm((f) =>
                              f ? { ...f, customerName: e.target.value } : f,
                            )
                          }
                        />
                      </Box>
                      <Box flex="1" minW="10rem">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                          Số điện thoại
                        </Text>
                        <Input
                          type="tel"
                          value={editForm.customerPhone}
                          maxLength={20}
                          {...fieldInputProps}
                          onChange={(e) =>
                            setEditForm((f) =>
                              f ? { ...f, customerPhone: e.target.value } : f,
                            )
                          }
                        />
                      </Box>
                    </HStack>
                  ) : (
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1}>
                        Khách hàng
                      </Text>
                      <NativeSelectRoot size="md">
                        <NativeSelectField
                          value={editForm.customerId}
                          {...fieldInputProps}
                          onChange={(e) =>
                            setEditForm((f) =>
                              f ? { ...f, customerId: e.target.value } : f,
                            )
                          }
                        >
                          {editCustomers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} — {c.phone}
                            </option>
                          ))}
                        </NativeSelectField>
                        <NativeSelectIndicator />
                      </NativeSelectRoot>
                    </Box>
                  )}
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Máy ảnh
                    </Text>
                    <NativeSelectRoot size="md">
                      <NativeSelectField
                        value={editForm.cameraId}
                        {...fieldInputProps}
                        onChange={(e) =>
                          setEditForm((f) =>
                            f
                              ? {
                                  ...f,
                                  cameraId: e.target.value,
                                  ...(bookingFormMode === "create"
                                    ? { rangeStart: "", rangeEnd: "" }
                                    : {}),
                                }
                              : f,
                          )
                        }
                      >
                        {bookingFormMode === "create" ? (
                          <option value="">— Chọn máy —</option>
                        ) : null}
                        {editCameras.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.brand} — {c.name}
                          </option>
                        ))}
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                  </Box>
                  {bookingFormMode === "create" ? (
                    <Box>
                      <Stack gap={1} mb={2}>
                        <Text fontSize="sm" fontWeight="medium" color={titleColor}>
                          Ngày sử dụng máy
                        </Text>
                        <Text fontSize="xs" color="fg.muted" lineHeight="tall">
                          Chọn ngày khách thực sự dùng máy (không tính đêm nhận
                          sớm). Giờ bắt đầu/kết thúc thuê theo buổi bên dưới.
                        </Text>
                      </Stack>
                      {editForm.cameraId ? (
                        <MonthCalendar
                          year={createCalendarYm.year}
                          month={createCalendarYm.month}
                          days={createCalendarDays}
                          startDate={editForm.rangeStart || null}
                          endDate={editForm.rangeEnd || null}
                          onViewChange={(y, m) =>
                            setCreateCalendarYm({ year: y, month: m })
                          }
                          onRangeChange={(start, end) => {
                            setEditForm((f) => {
                              if (!f) return f;
                              const dc = dayCountInclusive(start, end);
                              return {
                                ...f,
                                rangeStart: start,
                                rangeEnd: end,
                                slot: dc >= 2 ? "FULL_DAY" : f.slot,
                              };
                            });
                          }}
                        />
                      ) : (
                        <Text fontSize="sm" color="fg.muted">
                          Chọn máy ảnh để hiển thị lịch.
                        </Text>
                      )}
                      {createFormDayCount >= 2 ? (
                        <Text fontSize="sm" color="fg.muted" mt={2}>
                          {createFormDayCount} ngày — tự chọn buổi Cả ngày
                        </Text>
                      ) : null}
                    </Box>
                  ) : (
                    <HStack gap={3} align="flex-start" flexWrap="wrap">
                      <Box flex="1" minW="12rem">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                          Bắt đầu thuê
                        </Text>
                        <Input
                          type="datetime-local"
                          value={editForm.startBookingDateLocal}
                          {...fieldInputProps}
                          onChange={(e) =>
                            setEditForm((f) =>
                              f
                                ? {
                                    ...f,
                                    startBookingDateLocal: e.target.value,
                                  }
                                : f,
                            )
                          }
                        />
                      </Box>
                      <Box flex="1" minW="12rem">
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                          Kết thúc thuê
                        </Text>
                        <Input
                          type="datetime-local"
                          value={editForm.endBookingDateLocal}
                          {...fieldInputProps}
                          onChange={(e) =>
                            setEditForm((f) =>
                              f
                                ? {
                                    ...f,
                                    endBookingDateLocal: e.target.value,
                                  }
                                : f,
                            )
                          }
                        />
                      </Box>
                    </HStack>
                  )}
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Buổi
                      {bookingFormMode === "create" ? (
                        <Text as="span" fontWeight="normal" color="fg.muted">
                          {" "}
                          ({slotTimeRangeLabel(editForm.slot)})
                        </Text>
                      ) : null}
                    </Text>
                    <NativeSelectRoot
                      size="md"
                      disabled={
                        bookingFormMode === "create" && createFormForceFullDay
                      }
                    >
                      <NativeSelectField
                        value={editForm.slot}
                        {...fieldInputProps}
                        onChange={(e) =>
                          setEditForm((f) =>
                            f ? { ...f, slot: e.target.value } : f,
                          )
                        }
                      >
                        {BOOKING_SLOT_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {slotLabelVi(s)}
                          </option>
                        ))}
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Thời gian nhận máy
                    </Text>
                    <Input
                      type="datetime-local"
                      value={editForm.pickupAtLocal}
                      {...fieldInputProps}
                      onChange={(e) =>
                        setEditForm((f) =>
                          f ? { ...f, pickupAtLocal: e.target.value } : f,
                        )
                      }
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Số tiền (VND)
                    </Text>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={editForm.amount}
                      {...fieldInputProps}
                      onChange={(e) =>
                        setEditForm((f) =>
                          f ? { ...f, amount: e.target.value } : f,
                        )
                      }
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Địa chỉ giao (tuỳ chọn)
                    </Text>
                    <Textarea
                      value={editForm.shippingAddress}
                      rows={2}
                      maxLength={500}
                      {...fieldInputProps}
                      onChange={(e) =>
                        setEditForm((f) =>
                          f ? { ...f, shippingAddress: e.target.value } : f,
                        )
                      }
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Ghi chú
                    </Text>
                    <Textarea
                      value={editForm.note}
                      rows={3}
                      maxLength={2000}
                      {...fieldInputProps}
                      onChange={(e) =>
                        setEditForm((f) =>
                          f ? { ...f, note: e.target.value } : f,
                        )
                      }
                    />
                  </Box>
                  <HStack gap={3} flexWrap="wrap">
                    <Box flex="1" minW="10rem">
                      <Text fontSize="sm" fontWeight="medium" mb={1}>
                        Thanh toán
                      </Text>
                      <NativeSelectRoot size="md">
                        <NativeSelectField
                          value={editForm.paymentStatus}
                          {...fieldInputProps}
                          onChange={(e) =>
                            setEditForm((f) =>
                              f
                                ? {
                                    ...f,
                                    paymentStatus: e.target
                                      .value as PaymentStatusValue,
                                  }
                                : f,
                            )
                          }
                        >
                          {BOOKING_PAYMENT_EDIT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </NativeSelectField>
                        <NativeSelectIndicator />
                      </NativeSelectRoot>
                    </Box>
                    <Box flex="1" minW="10rem">
                      <Text fontSize="sm" fontWeight="medium" mb={1}>
                        Trạng thái
                      </Text>
                      <NativeSelectRoot size="md">
                        <NativeSelectField
                          value={editForm.status}
                          {...fieldInputProps}
                          onChange={(e) =>
                            setEditForm((f) =>
                              f
                                ? {
                                    ...f,
                                    status: e.target.value as BookingStatusValue,
                                  }
                                : f,
                            )
                          }
                        >
                          {BOOKING_STATUS_EDIT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </NativeSelectField>
                        <NativeSelectIndicator />
                      </NativeSelectRoot>
                    </Box>
                  </HStack>
                </Stack>
              ) : null}
            </DialogBody>
            <DialogFooter gap={2}>
              <Button
                type="button"
                variant="ghost"
                disabled={editSaving}
                onClick={closeBookingForm}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                colorPalette={APP_COLOR_PALETTE}
                loading={editSaving}
                disabled={editOptionsLoading || !editForm}
                onClick={() => void handleBookingFormSubmit()}
              >
                {bookingFormMode === "create" ? "Tạo đơn" : "Lưu"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Stack>
  );
}
