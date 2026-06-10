"use client";

import {
  Box,
  Button,
  createIcon,
  CardBody,
  IconButton,
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
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { MonthCalendar } from "@/components/booking/month-calendar";
import { BookingListCard } from "@/app/admin/bookings/booking-list-card";
import { BookingsListPanel } from "@/app/admin/bookings/bookings-list-panel";
import {
  BookingsSearchFields,
  type BookingsSearchField,
} from "@/app/admin/bookings/bookings-search-fields";
import { BookingPrintDialog } from "@/app/admin/bookings/booking-print-dialog";
import { BookingListRow } from "@/app/admin/bookings/booking-list-row";
import type {
  Booking,
  BookingStatusValue,
  PaymentStatusValue,
} from "@/app/admin/bookings/booking-types";
import {
  BOOKING_PAYMENT_EDIT_OPTIONS,
  isPaymentStatusValue,
  BOOKING_STATUS_EDIT_OPTIONS,
  paymentBadgeProps,
  bookingLocalDateKey,
  canAdminDeleteBooking,
  filterAndSortMobileTodayBookings,
  isMobileTodayBookingsMode,
  sortAdminSearchBookings,
} from "@/app/admin/bookings/booking-list-utils";
import {
  getQuickAdvancePatch,
  getQuickRevertPatch,
  quickAdvanceToastMessages,
  quickRevertToastMessages,
} from "@/lib/admin-booking-quick-advance";
import { identifyCustomer } from "@/lib/api";
import {
  dayCountInclusive,
  fetchCalendarMonth,
  type CalendarDay,
} from "@/lib/booking-api";
import {
  bookingCoversDateKeyVN,
  datetimeLocalToIso,
  isoToCalendarDateKey,
  isoToDatetimeLocal,
  slotBookingRangeToIso,
} from "@/lib/datetime-vn";
import {
  DELIVERY_FEE_VND,
  slotLabelVi,
  slotTimeRangeLabel,
} from "@/lib/booking-status";
import { rentalAmountVnd, bookingAmountVnd } from "@/lib/rental-pricing";
import type { BookingSlot } from "@/lib/booking-api";
import { normalizePhone } from "@/lib/normalize-phone";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { BRAND_LABEL } from "@/lib/camera-brands";
import { apiBase } from "@/lib/api-base";
import { parseVerificationUrls } from "@/lib/customer-verification-upload";
import {
  APP_COLOR_PALETTE,
  cardSurfaceProps,
  fieldInputProps,
  titleColor,
} from "@/lib/app-theme";
import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { toaster } from "@/lib/toaster";

const PAGE_SIZE_OPTIONS = [10, 30, 50] as const;

/** Khớp breakpoint `lg` của Chakra — card mobile admin. */
const MOBILE_MEDIA_QUERY = "(max-width: 63.9375em)";

function subscribeMobileViewport(onStoreChange: () => void) {
  const mq = window.matchMedia(MOBILE_MEDIA_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMobileViewportSnapshot() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function getMobileViewportServerSnapshot() {
  return false;
}

function useIsMobileViewport() {
  return useSyncExternalStore(
    subscribeMobileViewport,
    getMobileViewportSnapshot,
    getMobileViewportServerSnapshot,
  );
}

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

type AdminCustomerOption = { id: string; name: string; phone: string };
type AdminCameraOption = {
  id: string;
  brand: string;
  name: string;
  dayPrice: number;
  shiftPrice: number;
  discountPercent: number;
};

const BOOKING_SLOT_OPTIONS = [
  "FULL_DAY",
  "MORNING",
  "AFTERNOON",
  "EVENING",
] as const;

/** Lọc theo trạng thái đơn (API `status`) */
type StatusFilter =
  | "ALL"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "RENTING"
  | "COMPLETED"
  | "PENDING_REFUND_CANCEL"
  | "CANCELLED";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING_PAYMENT", label: "Chờ cọc" },
  { value: "CONFIRMED", label: "Chờ lấy máy" },
  { value: "RENTING", label: "Đang thuê" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "PENDING_REFUND_CANCEL", label: "Chờ hoàn tiền" },
  { value: "CANCELLED", label: "Đã hủy" },
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

function normalizeBookingCustomer(
  customer: Booking["customer"],
): Booking["customer"] {
  return {
    ...customer,
    verificationImageUrls: parseVerificationUrls(
      customer.verificationImageUrls,
    ),
  };
}

function normalizeBooking(row: Booking): Booking {
  return {
    ...row,
    customer: normalizeBookingCustomer(row.customer),
  };
}

function normalizeBookings(rows: Booking[]): Booking[] {
  return rows.map(normalizeBooking);
}

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
    paymentStatus: isPaymentStatusValue(b.paymentStatus)
      ? b.paymentStatus
      : "PENDING",
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

function editFormRentalDayCount(
  form: BookingEditForm,
  mode: "create" | "edit",
): number {
  if (mode === "create") {
    if (!form.rangeStart || !form.rangeEnd) return 0;
    return dayCountInclusive(form.rangeStart, form.rangeEnd);
  }
  const startKey = form.startBookingDateLocal.slice(0, 10);
  const endKey = form.endBookingDateLocal.slice(0, 10);
  if (startKey.length !== 10 || endKey.length !== 10) return 0;
  return dayCountInclusive(startKey, endKey);
}

/** Tiền thuê + phí giao — đồng bộ backend computeBookingAmount. */
function suggestedBookingAmountVnd(
  form: BookingEditForm,
  cameras: AdminCameraOption[],
  mode: "create" | "edit",
): number | null {
  const camera = cameras.find((c) => c.id === form.cameraId);
  if (!camera) return null;
  const dayCount = editFormRentalDayCount(form, mode);
  if (dayCount < 1) return null;
  const slot = (dayCount >= 2 ? "FULL_DAY" : form.slot) as BookingSlot;
  const rental = rentalAmountVnd(
    dayCount,
    camera.dayPrice,
    camera.shiftPrice,
    slot,
  );
  const delivery = form.shippingAddress.trim() ? DELIVERY_FEE_VND : 0;
  return bookingAmountVnd(rental, camera.discountPercent ?? 0, delivery);
}

function applySuggestedAmount(
  form: BookingEditForm,
  cameras: AdminCameraOption[],
  mode: "create" | "edit",
): BookingEditForm {
  const suggested = suggestedBookingAmountVnd(form, cameras, mode);
  if (suggested === null) return form;
  return { ...form, amount: String(suggested) };
}

/** Lọc theo `paymentStatus` từ API */
type PaymentStatusFilter = "ALL" | PaymentStatusValue;

const PAYMENT_FILTER_OPTIONS: { value: PaymentStatusFilter; label: string }[] =
  [
    { value: "ALL", label: "Tất cả" },
    { value: "PENDING", label: "Chưa cọc" },
    { value: "DEPOSITED", label: "Đã cọc" },
    { value: "PAID", label: "Đã thanh toán" },
    { value: "FAILED", label: "Thanh toán lỗi" },
    { value: "REFUNDED", label: "Đã hoàn tiền" },
  ];

type SearchField = BookingsSearchField;

type CameraFilter = "ALL" | string;

function cameraFilterLabel(c: AdminCameraOption): string {
  const brand =
    BRAND_LABEL[c.brand as keyof typeof BRAND_LABEL] ?? c.brand;
  return `${brand} — ${c.name}`;
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
      const needle = normalizePhone(q);
      if (needle.length === 0) return true;
      return normalizePhone(b.customer.phone).includes(needle);
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

function todayLocalDateKey(): string {
  return toLocalDateKey(new Date());
}

type QuickFilterKey =
  | "all"
  | "today"
  | "renting"
  | "pending_payment"
  | "pending_refund_cancel";

const QUICK_FILTER_OPTIONS: { value: QuickFilterKey; label: string }[] = [
  { value: "all", label: "Tất cả đơn" },
  { value: "today", label: "Đơn thuê hôm nay" },
  { value: "renting", label: "Đơn đang thuê" },
  { value: "pending_payment", label: "Đơn chờ cọc" },
  { value: "pending_refund_cancel", label: "Đơn chờ hoàn cọc" },
];

function quickFilterOptionLabel(
  opt: (typeof QUICK_FILTER_OPTIONS)[number],
  pendingRefundCancelCount: number,
): string {
  if (
    opt.value === "pending_refund_cancel" &&
    pendingRefundCancelCount > 0
  ) {
    const badge =
      pendingRefundCancelCount > 99 ? "99+" : String(pendingRefundCancelCount);
    return `${opt.label} (${badge})`;
  }
  return opt.label;
}

function deriveQuickFilter(params: {
  showAllDates: boolean;
  filterByPickupTime: boolean;
  filterDateKey: string;
  statusFilter: StatusFilter;
  paymentStatusFilter: PaymentStatusFilter;
  cameraFilter: CameraFilter;
}): QuickFilterKey | null {
  const {
    showAllDates,
    filterByPickupTime,
    filterDateKey,
    statusFilter,
    paymentStatusFilter,
    cameraFilter,
  } = params;
  const baseFiltersDefault =
    paymentStatusFilter === "ALL" && cameraFilter === "ALL";

  if (showAllDates && statusFilter === "ALL" && baseFiltersDefault) {
    return "all";
  }
  if (
    !showAllDates &&
    filterByPickupTime &&
    filterDateKey === todayLocalDateKey() &&
    statusFilter === "ALL" &&
    baseFiltersDefault
  ) {
    return "today";
  }
  if (showAllDates && statusFilter === "RENTING" && baseFiltersDefault) {
    return "renting";
  }
  if (showAllDates && statusFilter === "PENDING_PAYMENT" && baseFiltersDefault) {
    return "pending_payment";
  }
  if (
    showAllDates &&
    statusFilter === "PENDING_REFUND_CANCEL" &&
    baseFiltersDefault
  ) {
    return "pending_refund_cancel";
  }
  return null;
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
  const [printBooking, setPrintBooking] = useState<Booking | null>(null);
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
  const [filterByPickupTime, setFilterByPickupTime] = useState(true);
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatusFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [cameraFilter, setCameraFilter] = useState<CameraFilter>("ALL");
  const [filterCameras, setFilterCameras] = useState<AdminCameraOption[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);
  const isMobileViewport = useIsMobileViewport();

  const handleDebouncedSearchChange = useCallback(
    (next: { field: SearchField; query: string }) => {
      startTransition(() => {
        setSearchField(next.field);
        setSearchQuery(next.query);
        setPage(1);
      });
    },
    [],
  );

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
      await throwIfNotOk(res);
      const updated = normalizeBooking((await res.json()) as Booking);
      setBookings((prev) =>
        prev?.map((row) => (row.id === id ? updated : row)) ?? null,
      );
      setEditingBooking((prev) => (prev?.id === id ? updated : prev));
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
        const msg = toastApiError(e, "Không cập nhật được trạng thái đơn.");
        if (msg) setPatchError(msg);
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
        const updated = await patchBooking(id, { paymentStatus });
        toaster.success({
          title: `Đã cập nhật thanh toán: ${paymentBadgeProps(updated.paymentStatus).label}`,
        });
      } catch (e) {
        const msg = toastApiError(
          e,
          "Không cập nhật được trạng thái thanh toán.",
        );
        if (msg) setPatchError(msg);
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
          const msg = toastApiError(e, "Không cập nhật được đơn.");
          if (msg) setPatchError(msg);
        } finally {
          setQuickAdvanceSavingId(null);
        }
      })();
    },
    [patchBooking],
  );

  const handleQuickRevert = useCallback(
    (booking: Booking) => {
      const patch = getQuickRevertPatch(booking);
      if (!patch) return;
      void (async () => {
        setPatchError(null);
        setQuickAdvanceSavingId(booking.id);
        try {
          await patchBooking(booking.id, patch);
          for (const msg of quickRevertToastMessages(patch)) {
            toaster.success({ title: msg });
          }
        } catch (e) {
          const msg = toastApiError(e, "Không cập nhật được đơn.");
          if (msg) setPatchError(msg);
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
      await throwIfNotOk(camRes, "Không tải được danh sách máy");
      const cameras = (await camRes.json()) as AdminCameraOption[];
      setEditCameras(cameras);
      if (mode === "edit") {
        const custRes = await fetch(`${apiBase()}/api/customers`, {
          credentials: "include",
        });
        await throwIfNotOk(custRes, "Không tải được danh sách khách");
        const customers = (await custRes.json()) as AdminCustomerOption[];
        setEditCustomers(customers);
      } else {
        setEditCustomers([]);
      }
    } catch (e) {
      const msg = toastApiError(e, "Không tải được dữ liệu form");
      if (msg) setEditError(msg);
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

  const syncEditFormAmount = useCallback(
    (form: BookingEditForm): BookingEditForm => {
      if (!bookingFormMode) return form;
      return applySuggestedAmount(form, editCameras, bookingFormMode);
    },
    [bookingFormMode, editCameras],
  );

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
      .catch((e) => {
        toastApiError(e, "Không tải được lịch trống");
        setCreateCalendarDays(undefined);
      });
  }, [bookingFormMode, editForm?.cameraId, createCalendarYm]);

  const createBooking = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch(`${apiBase()}/api/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await throwIfNotOk(res, "Không tạo được đơn");
      const created = normalizeBooking((await res.json()) as Booking);
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
        const msg = toastApiError(
          e,
          isCreate ? "Không tạo được đơn." : "Không cập nhật được đơn.",
        );
        if (msg) setEditError(msg);
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
    if (!canAdminDeleteBooking(booking.status)) {
      const msg = "Chỉ xóa được đơn chờ cọc hoặc đơn đã hủy.";
      toaster.error({ title: msg });
      setPatchError(msg);
      return;
    }
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
        await throwIfNotOk(res, "Không xóa được đơn thuê.");
        setBookings((prev) => prev?.filter((row) => row.id !== booking.id) ?? null);
        toaster.success({ title: `Đã xóa đơn ${booking.bookingCode}` });
      } catch (e) {
        const msg = toastApiError(e, "Không xóa được đơn thuê.");
        if (msg) setPatchError(msg);
      } finally {
        setDeleteSavingId(null);
      }
    })();
  }, []);

  const mobileTodayMode = useMemo(
    () =>
      isMobileTodayBookingsMode({
        isMobileViewport,
        showAllDates,
        filterByPickupTime,
        filterDateKey,
        todayKey: todayLocalDateKey(),
      }),
    [isMobileViewport, showAllDates, filterByPickupTime, filterDateKey],
  );

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];

    const matchesCommonFilters = (b: Booking) => {
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
    };

    if (mobileTodayMode) {
      return filterAndSortMobileTodayBookings(
        bookings.filter(matchesCommonFilters),
        filterDateKey,
      );
    }

    const applyDateFilter = !showAllDates;

    const filtered = bookings.filter((b) => {
      if (applyDateFilter) {
        if (filterByPickupTime) {
          const pickupKey = bookingLocalDateKey(
            b.pickupAt ?? b.startBookingDate,
          );
          if (pickupKey !== filterDateKey) {
            return false;
          }
        } else if (
          !bookingCoversDateKeyVN(
            b.startBookingDate,
            b.endBookingDate,
            filterDateKey,
          )
        ) {
          return false;
        }
      }
      return matchesCommonFilters(b);
    });
    return sortAdminSearchBookings(filtered);
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
    mobileTodayMode,
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
      await throwIfNotOk(res, "Lỗi tải dữ liệu đơn thuê");
      const json = (await res.json()) as Booking[];
      if (!signal?.aborted) setBookings(normalizeBookings(json));
    } catch (e) {
      if (signal?.aborted) return;
      setBookings(null);
      const msg = toastApiError(e, "Lỗi tải dữ liệu");
      if (msg) setError(msg);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const getBookingListProps = useCallback(
    (b: Booking) => ({
      booking: b,
      isRowSaving: isRowSaving(b.id),
      quickAdvanceSaving: quickAdvanceSavingId === b.id,
      deleteSaving: deleteSavingId === b.id,
      canQuickAdvance: getQuickAdvancePatch(b) !== null,
      canQuickRevert: getQuickRevertPatch(b) !== null,
      onCopyPhone: (phone: string) => void copyToClipboard(phone),
      onPaymentChange: handleBookingPaymentChange,
      onStatusChange: handleBookingStatusChange,
      onMenuOpenChange: () => setPatchError(null),
      onQuickAdvance: () => void handleQuickAdvance(b),
      onQuickRevert: () => void handleQuickRevert(b),
      onEdit: () => openEditBooking(b),
      onDelete: () => void handleBookingDelete(b),
      onCccdUploaded: () => void loadBookings(),
    }),
    [
      isRowSaving,
      quickAdvanceSavingId,
      deleteSavingId,
      copyToClipboard,
      handleBookingPaymentChange,
      handleBookingStatusChange,
      handleQuickAdvance,
      handleQuickRevert,
      loadBookings,
    ],
  );

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
      } catch (e) {
        toastApiError(e, "Không tải danh sách máy lọc");
        setFilterCameras([]);
      }
    })();
  }, []);

  const activeQuickFilter = useMemo(
    () =>
      deriveQuickFilter({
        showAllDates,
        filterByPickupTime,
        filterDateKey,
        statusFilter,
        paymentStatusFilter,
        cameraFilter,
      }),
    [
      showAllDates,
      filterByPickupTime,
      filterDateKey,
      statusFilter,
      paymentStatusFilter,
      cameraFilter,
    ],
  );

  const applyQuickFilter = useCallback((key: QuickFilterKey) => {
    setPage(1);
    switch (key) {
      case "all":
        setShowAllDates(true);
        setStatusFilter("ALL");
        setPaymentStatusFilter("ALL");
        setCameraFilter("ALL");
        break;
      case "today":
        setSearchField("phone");
        setShowAllDates(false);
        setFilterByPickupTime(true);
        setFilterDateKey(todayLocalDateKey());
        setStatusFilter("ALL");
        setPaymentStatusFilter("ALL");
        setCameraFilter("ALL");
        setSearchQuery("");
        break;
      case "renting":
        setSearchField("phone");
        setShowAllDates(true);
        setStatusFilter("RENTING");
        setPaymentStatusFilter("ALL");
        setCameraFilter("ALL");
        setSearchQuery("");
        break;
      case "pending_payment":
        setSearchField("phone");
        setShowAllDates(true);
        setStatusFilter("PENDING_PAYMENT");
        setPaymentStatusFilter("ALL");
        setCameraFilter("ALL");
        setSearchQuery("");
        break;
      case "pending_refund_cancel":
        setSearchField("phone");
        setShowAllDates(true);
        setStatusFilter("PENDING_REFUND_CANCEL");
        setPaymentStatusFilter("ALL");
        setCameraFilter("ALL");
        setSearchQuery("");
        break;
    }
  }, []);

  const pendingRefundCancelCount = useMemo(
    () =>
      bookings?.filter((b) => b.status === "PENDING_REFUND_CANCEL").length ?? 0,
    [bookings],
  );

  const pagedBookingRows = useMemo(
    () =>
      pagedBookings.map((b, index) => (
        <BookingListRow
          key={b.id}
          rowNumber={(clampedPage - 1) * pageSize + index + 1}
          {...getBookingListProps(b)}
          onPrint={() => setPrintBooking(b)}
        />
      )),
    [pagedBookings, getBookingListProps, clampedPage, pageSize],
  );

  const pagedBookingCards = useMemo(() => {
    if (!isMobileViewport) return null;
    return pagedBookings.map((b) => (
      <BookingListCard key={b.id} {...getBookingListProps(b)} />
    ));
  }, [isMobileViewport, pagedBookings, getBookingListProps]);

  const listEmptyMessage = useMemo(
    () =>
      mobileTodayMode
        ? "Không có đơn chờ cọc, chờ lấy máy, đang thuê (trả hôm nay) hoặc hoàn tất (nhận hôm nay/ngày mai)."
        : showAllDates
          ? "Không có đơn phù hợp bộ lọc trạng thái, máy ảnh hoặc tìm kiếm."
          : filterByPickupTime
            ? "Không có đơn trong ngày đã chọn, bộ lọc trạng thái/thanh toán/máy hoặc khớp tìm kiếm."
            : "Không có đơn trong kỳ thuê ngày đã chọn, bộ lọc trạng thái/thanh toán/máy hoặc khớp tìm kiếm.",
    [mobileTodayMode, showAllDates, filterByPickupTime],
  );

  const handleListPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const handleListPrevPage = useCallback(() => {
    setPage(Math.max(1, clampedPage - 1));
  }, [clampedPage]);

  const handleListNextPage = useCallback(() => {
    setPage(Math.min(totalPages, clampedPage + 1));
  }, [clampedPage, totalPages]);

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={4} w="full">
            {/* Mobile toolbar */}
            <Stack
              display={{ base: "flex", lg: "none" }}
              gap={3}
              w="full"
            >
              <HStack justify="space-between" align="center" w="full">
                <CardTitle textStyle="xl">Đơn thuê</CardTitle>
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
              </HStack>
              {bookings !== null ? (
                <Stack gap={1.5} w="full">
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                    Lọc nhanh
                  </Text>
                  <NativeSelectRoot size="sm" w="full">
                    <NativeSelectField
                      value={activeQuickFilter ?? ""}
                      bg="white"
                      borderWidth="1px"
                      borderColor="gray.200"
                      onChange={(e) => {
                        const key = e.target.value as QuickFilterKey | "";
                        if (key) applyQuickFilter(key);
                      }}
                      aria-label="Chế độ lọc nhanh"
                    >
                      {activeQuickFilter === null ? (
                        <option value="">Tùy chỉnh</option>
                      ) : null}
                      {QUICK_FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {quickFilterOptionLabel(opt, pendingRefundCancelCount)}
                        </option>
                      ))}
                    </NativeSelectField>
                    <NativeSelectIndicator />
                  </NativeSelectRoot>
                </Stack>
              ) : null}
            </Stack>

            {/* Desktop toolbar */}
            <HStack
              display={{ base: "none", lg: "flex" }}
              justify="space-between"
              align="center"
              gap={4}
              flexWrap="wrap"
              rowGap={3}
              w="full"
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
                  {QUICK_FILTER_OPTIONS.map((opt) => {
                    const showRefundBadge =
                      opt.value === "pending_refund_cancel" &&
                      pendingRefundCancelCount > 0;
                    const refundBadgeLabel =
                      pendingRefundCancelCount > 99
                        ? "99+"
                        : String(pendingRefundCancelCount);
                    return (
                      <Box
                        key={opt.value}
                        position="relative"
                        display="inline-block"
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            activeQuickFilter === opt.value
                              ? "solid"
                              : "outline"
                          }
                          colorPalette={APP_COLOR_PALETTE}
                          onClick={() => applyQuickFilter(opt.value)}
                          aria-label={quickFilterOptionLabel(
                            opt,
                            pendingRefundCancelCount,
                          )}
                        >
                          {opt.label}
                        </Button>
                        {showRefundBadge ? (
                          <Box
                            position="absolute"
                            top="-6px"
                            right="-6px"
                            minW="18px"
                            h="18px"
                            px={1}
                            borderRadius="full"
                            bg="red.500"
                            color="white"
                            fontSize="xs"
                            fontWeight="bold"
                            lineHeight="1"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            pointerEvents="none"
                            aria-hidden
                          >
                            {refundBadgeLabel}
                          </Box>
                        ) : null}
                      </Box>
                    );
                  })}
                </HStack>
              ) : null}
            </HStack>
            {bookings && bookings.length > 0 ? (
              <BookingsSearchFields
                showMobilePhone
                showDesktop={false}
                appliedField={searchField}
                appliedQuery={searchQuery}
                onDebouncedChange={handleDebouncedSearchChange}
              />
            ) : null}

            {bookings && bookings.length > 0 ? (
              <HStack
                display={{ base: "none", lg: "flex" }}
                w="full"
                align="flex-start"
                justify="space-between"
                gap={4}
                flexWrap="nowrap"
              >
                <HStack
                  gap={4}
                  align="flex-start"
                  flexWrap="wrap"
                  flexShrink={0}
                >
                  <Stack
                    gap={2}
                    align="flex-start"
                    w={{ base: "full", md: "auto" }}
                    minW={{ md: "11rem" }}
                  >
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="fg.muted"
                    >
                      {filterByPickupTime
                        ? "Ngày nhận máy"
                        : "Ngày trong kỳ thuê"}
                    </Text>
                    <Input
                      type="date"
                      size="sm"
                      w={{ base: "full", md: "auto" }}
                      minW={{ md: "11rem" }}
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
                          : "Lọc theo ngày trong kỳ thuê"
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
                  <Stack
                    gap={2}
                    align="flex-start"
                    w={{ base: "full", md: "auto" }}
                    minW={{ md: "11rem" }}
                  >
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="fg.muted"
                    >
                      Thanh toán
                    </Text>
                    <NativeSelectRoot size="sm" w="full" minW={{ md: "11rem" }}>
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
                  <Stack
                    gap={2}
                    align="flex-start"
                    w={{ base: "full", md: "auto" }}
                    minW={{ md: "11rem" }}
                  >
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="fg.muted"
                    >
                      Trạng thái đơn
                    </Text>
                    <NativeSelectRoot size="sm" w="full" minW={{ md: "11rem" }}>
                      <NativeSelectField
                        value={
                          STATUS_FILTER_OPTIONS.some(
                            (o) => o.value === statusFilter,
                          )
                            ? statusFilter
                            : "ALL"
                        }
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
                  <Stack
                    gap={2}
                    align="flex-start"
                    w={{ base: "full", md: "auto" }}
                    minW={{ md: "11rem" }}
                  >
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="fg.muted"
                    >
                      Máy ảnh
                    </Text>
                    <NativeSelectRoot size="sm" w="full" minW={{ md: "11rem" }}>
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
                <BookingsSearchFields
                  showMobilePhone={false}
                  showDesktop
                  appliedField={searchField}
                  appliedQuery={searchQuery}
                  onDebouncedChange={handleDebouncedSearchChange}
                />
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
            <BookingsListPanel
              isEmpty={filteredBookings.length === 0}
              emptyMessage={listEmptyMessage}
              patchError={patchError}
              tableRows={pagedBookingRows}
              cards={pagedBookingCards}
              clampedPage={clampedPage}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={handleListPageSizeChange}
              onPrevPage={handleListPrevPage}
              onNextPage={handleListNextPage}
            />
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
          <DialogContent maxW="lg" w="full" mx={4}>
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
                          setEditForm((f) => {
                            if (!f) return f;
                            return syncEditFormAmount({
                              ...f,
                              cameraId: e.target.value,
                              ...(bookingFormMode === "create"
                                ? { rangeStart: "", rangeEnd: "" }
                                : {}),
                            });
                          })
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
                          allowClosedDays
                          onViewChange={(y, m) =>
                            setCreateCalendarYm({ year: y, month: m })
                          }
                          onRangeChange={(start, end) => {
                            setEditForm((f) => {
                              if (!f) return f;
                              const dc = dayCountInclusive(start, end);
                              return syncEditFormAmount({
                                ...f,
                                rangeStart: start,
                                rangeEnd: end,
                                slot: dc >= 2 ? "FULL_DAY" : f.slot,
                              });
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
                                ? syncEditFormAmount({
                                    ...f,
                                    startBookingDateLocal: e.target.value,
                                  })
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
                                ? syncEditFormAmount({
                                    ...f,
                                    endBookingDateLocal: e.target.value,
                                  })
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
                            f
                              ? syncEditFormAmount({
                                  ...f,
                                  slot: e.target.value,
                                })
                              : f,
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
                          f
                            ? syncEditFormAmount({
                                ...f,
                                shippingAddress: e.target.value,
                              })
                            : f,
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

      <BookingPrintDialog
        booking={printBooking}
        open={printBooking !== null}
        onOpenChange={(open) => {
          if (!open) setPrintBooking(null);
        }}
      />
    </Stack>
  );
}
