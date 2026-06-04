"use client";

import {
  Badge,
  Box,
  Button,
  CardBody,
  CardRoot,
  CheckboxControl,
  CheckboxHiddenInput,
  CheckboxLabel,
  CheckboxRoot,
  HStack,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { BookStepFooter } from "@/components/user/book-step-footer";
import { BrandPickerButton } from "@/components/camera/brand-picker-button";
import { CameraPickerCard } from "@/components/camera/camera-picker-card";
import { CameraDiscountBadge } from "@/components/camera/camera-discount-badge";
import { DiscountedPriceLine } from "@/components/camera/discounted-price-line";
import { MonthCalendar } from "@/components/booking/month-calendar";
import { PickupTimePicker } from "@/components/booking/pickup-time-picker";
import { SlotHoursLabel } from "@/components/booking/slot-hours-label";
import { BRAND_LABEL, CAMERA_BRAND_OPTIONS } from "@/lib/camera-brands";
import { getDeliveryAreaLabel } from "@/lib/site-config";
import {
  createCustomerBooking,
  dayCountInclusive,
  fetchBrandsWithCameras,
  fetchCalendarMonth,
  fetchCamerasForRange,
  fetchPublicCamera,
  fetchPublicCameras,
  fetchPublicLenses,
  fetchRangeAvailability,
  fetchRangeSlotsAnyAvailability,
  fetchRangeSlotsAvailability,
  fetchSlots,
  formatBookingRangeLabel,
  type BookingSlot,
  type CameraBrand,
  type CameraWithAvailability,
  type PublicCamera,
  type PublicLens,
} from "@/lib/booking-api";
import {
  WIZARD_STEP,
  wizardBrandStep,
  wizardCameraStep,
  wizardLensStep,
  wizardPickupStep,
  wizardStepAfterLens,
  wizardSlotStep,
  wizardSummaryStep,
  type BookWizardMode,
} from "@/lib/book-wizard-steps";
import {
  lensDisplayLabel,
  lensIdAfterSkip,
  shouldSkipLensStep,
} from "@/lib/lens-step";
import { balanceDueVnd } from "@/lib/booking-payment";
import {
  fetchCustomerVerification,
  fetchMyBookings,
  requestCustomerBookingChange,
  updatePendingCustomerBooking,
  type MyBooking,
} from "@/lib/api";
import { DELIVERY_FEE_VND } from "@/lib/booking-status";
import {
  addDaysYmd,
  datetimeLocalToIso,
  formatPickupAtLocalVi,
  isSundayYmd,
  slotPickupBounds,
  validatePickupAtLocal,
} from "@/lib/datetime-vn";
import {
  bookingAmountWithLensVnd,
  isReturnNextMorningEligible,
  rentalAmountWithOptionsVnd,
  returnNextMorningSurchargeVnd,
} from "@/lib/rental-pricing";
import { getSession, setSession } from "@/lib/customer-session";
import {
  APP_COLOR_PALETTE,
  titleColor,
  userCardProps,
  userFieldInputProps,
  userOutlineButtonProps,
  userSolidButtonProps,
} from "@/lib/user-theme";

const SLOTS: BookingSlot[] = [
  "FULL_DAY",
  "MORNING",
  "AFTERNOON",
  "EVENING",
];

type Mode = "BY_CAMERA" | "BY_DATE" | null;

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** Khoảng cách phía trên nút Tiếp tục ở mỗi step. */
const STEP_CONTINUE_BUTTON_PROPS = { mt: 8 } as const;

function nowYm(): { year: number; month: number } {
  const t = new Date();
  const vn = new Date(t.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth() + 1,
  };
}

function BookPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const changeBookingId = searchParams.get("changeBookingId");
  const editBookingId = searchParams.get("editBookingId");
  const preselectCameraId = searchParams.get("cameraId");
  const [changeSource, setChangeSource] = useState<MyBooking | null>(null);
  const [editSource, setEditSource] = useState<MyBooking | null>(null);
  const [changeLoading, setChangeLoading] = useState(
    !!changeBookingId || !!editBookingId,
  );
  const modifyBookingId = changeSource?.id ?? editSource?.id;
  const [mode, setMode] = useState<Mode>(null);
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState<CameraBrand | null>(null);
  const [camera, setCamera] = useState<PublicCamera | null>(null);
  const [lens, setLens] = useState<PublicLens | null>(null);
  const [lenses, setLenses] = useState<PublicLens[]>([]);
  const [listedBrands, setListedBrands] = useState<CameraBrand[]>([]);
  const [cameras, setCameras] = useState<PublicCamera[]>([]);
  const [camerasAvail, setCamerasAvail] = useState<CameraWithAvailability[]>(
    [],
  );
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<BookingSlot | null>("FULL_DAY");
  const [returnNextMorning, setReturnNextMorning] = useState(false);
  const [morningNextDayAvailable, setMorningNextDayAvailable] = useState<
    boolean | null
  >(null);
  const [note, setNote] = useState("");
  const [pickupAtLocal, setPickupAtLocal] = useState("");
  const [pickupAtError, setPickupAtError] = useState<string | null>(null);
  const [pickupValidated, setPickupValidated] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [canRequestDelivery, setCanRequestDelivery] = useState(false);
  const [wantDelivery, setWantDelivery] = useState(false);
  const [calendarDays, setCalendarDays] = useState<
    Awaited<ReturnType<typeof fetchCalendarMonth>>["days"] | undefined
  >();
  const [rangeOk, setRangeOk] = useState<boolean | null>(null);
  const [slotAvailability, setSlotAvailability] = useState<Partial<
    Record<BookingSlot, boolean>
  > | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const ym = nowYm();

  useEffect(() => {
    if (!getSession()) router.replace("/");
  }, [router]);

  useEffect(() => {
    if (changeBookingId || editBookingId || !preselectCameraId) return;
    void fetchPublicCamera(preselectCameraId)
      .then((cam) => {
        setMode("BY_CAMERA");
        setBrand(cam.brand);
        void advanceAfterCameraSelect(cam, "BY_CAMERA");
      })
      .catch(() => {
        setError("Không tải được thông tin máy đã chọn.");
      });
  }, [changeBookingId, editBookingId, preselectCameraId]);

  useEffect(() => {
    const s = getSession();
    if (!s) return;
    setCanRequestDelivery(s.isVerified === true);
    void fetchCustomerVerification(s.phone)
      .then((r) => {
        setCanRequestDelivery(r.isVerified);
        if (s.isVerified !== r.isVerified) {
          setSession({ ...s, isVerified: r.isVerified });
        }
      })
      .catch(() => setCanRequestDelivery(false));
  }, []);

  useEffect(() => {
    if (!canRequestDelivery) {
      setWantDelivery(false);
      setShippingAddress("");
    }
  }, [canRequestDelivery]);

  const dayCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return dayCountInclusive(startDate, endDate);
  }, [startDate, endDate]);

  const forceFullDay = dayCount >= 2;

  const effectiveSlot = forceFullDay ? "FULL_DAY" : slot;

  const deliverySelected =
    canRequestDelivery && wantDelivery;

  const showReturnNextMorningOption =
    !!effectiveSlot && isReturnNextMorningEligible(effectiveSlot);

  const returnNextMorningSurcharge = useMemo(() => {
    if (!returnNextMorning || !camera) return 0;
    return returnNextMorningSurchargeVnd(camera.dayPrice);
  }, [returnNextMorning, camera]);

  const estimatedRental = useMemo(() => {
    if (!camera || !effectiveSlot || dayCount < 1) return 0;
    return rentalAmountWithOptionsVnd(
      dayCount,
      camera.dayPrice,
      camera.shiftPrice,
      effectiveSlot,
      returnNextMorning,
    );
  }, [camera, effectiveSlot, dayCount, returnNextMorning]);

  const discountPercent = camera?.discountPercent ?? 0;

  const estimatedLensRental = useMemo(() => {
    if (!lens || !effectiveSlot || dayCount < 1) return 0;
    return rentalAmountWithOptionsVnd(
      dayCount,
      lens.dayPrice,
      lens.shiftPrice,
      effectiveSlot,
      returnNextMorning,
    );
  }, [lens, effectiveSlot, dayCount, returnNextMorning]);

  const lensDiscountPercent = lens?.discountPercent ?? 0;

  const estimatedAmount = useMemo(() => {
    if (!camera || !effectiveSlot || dayCount < 1) return 0;
    const delivery = deliverySelected ? DELIVERY_FEE_VND : 0;
    return bookingAmountWithLensVnd(
      estimatedRental,
      discountPercent,
      estimatedLensRental,
      lensDiscountPercent,
      delivery,
    );
  }, [
    camera,
    effectiveSlot,
    dayCount,
    deliverySelected,
    estimatedRental,
    discountPercent,
    estimatedLensRental,
    lensDiscountPercent,
  ]);

  const loadCalendar = useCallback(
    async (cameraId: string) => {
      const data = await fetchCalendarMonth(
        cameraId,
        ym.year,
        ym.month,
        modifyBookingId,
      );
      setCalendarDays(data.days);
    },
    [ym.year, ym.month, modifyBookingId],
  );

  useEffect(() => {
    if (mode === "BY_CAMERA" && camera) {
      void loadCalendar(camera.id).catch(() => setCalendarDays(undefined));
    }
  }, [mode, camera, loadCalendar]);

  useEffect(() => {
    if (!changeBookingId) return;
    const session = getSession();
    if (!session) return;

    void (async () => {
      setChangeLoading(true);
      setError(null);
      try {
        const list = await fetchMyBookings(session.phone);
        const b = list.find(
          (x) =>
            x.id === changeBookingId &&
            x.status === "CONFIRMED" &&
            x.paymentStatus === "DEPOSITED",
        );
        if (!b) {
          router.replace("/home");
          return;
        }
        setChangeSource(b);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được đơn");
      } finally {
        setChangeLoading(false);
      }
    })();
  }, [changeBookingId, router]);

  useEffect(() => {
    if (!editBookingId) return;
    const session = getSession();
    if (!session) return;

    void (async () => {
      setChangeLoading(true);
      setError(null);
      try {
        const list = await fetchMyBookings(session.phone);
        const b = list.find(
          (x) =>
            x.id === editBookingId && x.status === "PENDING_PAYMENT",
        );
        if (!b) {
          router.replace("/home");
          return;
        }
        setEditSource(b);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được đơn");
      } finally {
        setChangeLoading(false);
      }
    })();
  }, [editBookingId, router]);

  useEffect(() => {
    if (forceFullDay) setSlot("FULL_DAY");
  }, [forceFullDay]);

  useEffect(() => {
    if (!showReturnNextMorningOption) {
      setReturnNextMorning(false);
    }
  }, [showReturnNextMorningOption, startDate, endDate, effectiveSlot]);

  useEffect(() => {
    if (!camera?.id || !endDate || !showReturnNextMorningOption) {
      setMorningNextDayAvailable(null);
      return;
    }
    const morningDate = addDaysYmd(endDate, 1);
    void fetchSlots(camera.id, morningDate, modifyBookingId)
      .then((r) => {
        setMorningNextDayAvailable(r.slots.MORNING?.available ?? false);
      })
      .catch(() => setMorningNextDayAvailable(false));
  }, [
    camera?.id,
    endDate,
    showReturnNextMorningOption,
    modifyBookingId,
  ]);

  useEffect(() => {
    setPickupAtError(null);
    setPickupValidated(false);
    if (!startDate || !effectiveSlot) {
      setPickupAtLocal("");
      return;
    }
    setPickupAtLocal(slotPickupBounds(startDate, effectiveSlot).defaultLocal);
  }, [startDate, effectiveSlot]);

  const pickupBounds = useMemo(() => {
    if (!startDate || !effectiveSlot) return null;
    return slotPickupBounds(startDate, effectiveSlot);
  }, [startDate, effectiveSlot]);

  useEffect(() => {
    if (!camera || !startDate || !endDate || !effectiveSlot) {
      setRangeOk(null);
      return;
    }
    void fetchRangeAvailability(
      camera.id,
      startDate,
      endDate,
      effectiveSlot,
      modifyBookingId,
    )
      .then((r) => setRangeOk(r.available))
      .catch(() => setRangeOk(false));
  }, [camera, startDate, endDate, effectiveSlot, modifyBookingId]);

  const onSlotStep =
    (mode === "BY_CAMERA" && step === WIZARD_STEP.BY_CAMERA.SLOT && !!camera) ||
    (mode === "BY_DATE" && step === WIZARD_STEP.BY_DATE.SLOT);
  const onDateStepForceFullDay =
    forceFullDay &&
    !!startDate &&
    !!endDate &&
    ((mode === "BY_CAMERA" &&
      step === WIZARD_STEP.BY_CAMERA.DATE &&
      !!camera) ||
      (mode === "BY_DATE" && step === WIZARD_STEP.BY_DATE.DATE));

  useEffect(() => {
    if (!startDate || !endDate) {
      setSlotAvailability(null);
      setSlotsLoading(false);
      return;
    }
    if (!onSlotStep && !onDateStepForceFullDay) {
      setSlotAvailability(null);
      setSlotsLoading(false);
      return;
    }

    setSlotsLoading(true);
    void (async () => {
      try {
        const excludeId = modifyBookingId;
        const { slots } =
          mode === "BY_CAMERA" && camera
            ? await fetchRangeSlotsAvailability(
                camera.id,
                startDate,
                endDate,
                excludeId,
              )
            : await fetchRangeSlotsAnyAvailability(
                startDate,
                endDate,
                excludeId,
              );
        const mapped: Partial<Record<BookingSlot, boolean>> = {};
        for (const s of SLOTS) {
          mapped[s] = slots[s]?.available ?? false;
        }
        setSlotAvailability(mapped);
      } catch {
        setSlotAvailability(null);
      } finally {
        setSlotsLoading(false);
      }
    })();
  }, [
    mode,
    step,
    camera,
    startDate,
    endDate,
    forceFullDay,
    modifyBookingId,
    onSlotStep,
    onDateStepForceFullDay,
  ]);

  useEffect(() => {
    if (!slot || !slotAvailability) return;
    if (slotAvailability[slot] === false) setSlot(null);
  }, [slot, slotAvailability]);

  const fullDayCanContinue =
    !forceFullDay ||
    (!slotsLoading &&
      slotAvailability !== null &&
      slotAvailability.FULL_DAY === true);

  async function loadCamerasForBrand(b: CameraBrand) {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPublicCameras(b);
      setCameras(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải máy");
    } finally {
      setLoading(false);
    }
  }

  async function loadCamerasAvail(b: CameraBrand) {
    if (!startDate || !endDate || !effectiveSlot) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCamerasForRange(
        startDate,
        endDate,
        effectiveSlot,
        b,
        modifyBookingId,
      );
      setCamerasAvail(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải máy");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mode) return;
    void fetchBrandsWithCameras()
      .then(setListedBrands)
      .catch(() => setListedBrands([]));
  }, [mode]);

  const brandOptions = useMemo(
    () => CAMERA_BRAND_OPTIONS.filter((b) => listedBrands.includes(b.id)),
    [listedBrands],
  );

  useEffect(() => {
    if (mode !== "BY_CAMERA" || step !== WIZARD_STEP.BY_CAMERA.CAMERA || !brand)
      return;
    void loadCamerasForBrand(brand);
  }, [mode, step, brand]);

  useEffect(() => {
    if (mode !== "BY_DATE" || step !== WIZARD_STEP.BY_DATE.CAMERA || !brand)
      return;
    if (!startDate || !endDate || !effectiveSlot) return;
    void loadCamerasAvail(brand);
  }, [mode, step, brand, startDate, endDate, effectiveSlot]);

  async function advanceAfterCameraSelect(
    selected: PublicCamera,
    wizardMode: BookWizardMode,
  ) {
    setCamera(selected);
    setLens(null);
    setLenses([]);
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPublicLenses(selected.id);
      setLenses(list);
      if (shouldSkipLensStep(list)) {
        const autoId = lensIdAfterSkip(list);
        setLens(autoId ? (list.find((l) => l.id === autoId) ?? null) : null);
        setStep(wizardStepAfterLens(wizardMode));
      } else {
        setStep(wizardLensStep(wizardMode));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải ống kính");
      setStep(wizardCameraStep(wizardMode));
    } finally {
      setLoading(false);
    }
  }

  function resetWizard(m: Mode) {
    setMode(m);
    setStep(0);
    setBrand(null);
    setCamera(null);
    setLens(null);
    setLenses([]);
    setCameras([]);
    setCamerasAvail([]);
    setStartDate(null);
    setEndDate(null);
    setSlot("FULL_DAY");
    setRangeOk(null);
    setSlotAvailability(null);
    setSlotsLoading(false);
    setError(null);
    setWantDelivery(false);
    setShippingAddress("");
    setNote("");
    setPickupAtLocal("");
    setPickupAtError(null);
    setPickupValidated(false);
  }

  function handleRangeChange(s: string, e: string) {
    setStartDate(s);
    setEndDate(e);
    if (dayCountInclusive(s, e) >= 2) setSlot("FULL_DAY");
  }

  const changeBalanceDue = useMemo(
    () => balanceDueVnd(estimatedAmount),
    [estimatedAmount],
  );

  const handlePickupTimeChange = useCallback((local: string) => {
    setPickupAtLocal(local);
    setPickupAtError(null);
    setPickupValidated(false);
  }, []);

  function getPickupAtValidationError(): string | null {
    if (!startDate || !effectiveSlot) return null;
    if (!pickupAtLocal.trim()) {
      return "Vui lòng chọn thời gian nhận máy.";
    }
    return validatePickupAtLocal(startDate, effectiveSlot, pickupAtLocal);
  }

  function resolvePickupAtIso(): string | null {
    if (!pickupValidated || !pickupAtLocal.trim()) return null;
    if (!startDate || !effectiveSlot) return null;
    if (getPickupAtValidationError()) return null;
    try {
      return datetimeLocalToIso(pickupAtLocal);
    } catch {
      return null;
    }
  }

  function advanceFromSlotStep(nextStep: number) {
    if (!slotStepCanContinue()) return;
    setError(null);
    setStep(nextStep);
  }

  function tryAdvanceFromPickupStep(nextStep: number) {
    const err = getPickupAtValidationError();
    if (err) {
      setPickupAtError(err);
      setPickupValidated(false);
      return;
    }
    setPickupAtError(null);
    setPickupValidated(true);
    setError(null);
    setStep(nextStep);
  }

  async function handleChangeSubmit() {
    const session = getSession();
    if (
      !session ||
      !changeSource ||
      !camera ||
      !startDate ||
      !endDate ||
      !effectiveSlot
    ) {
      return;
    }
    if (!bookingAvailabilityOk) {
      setError(
        rangeOk === false
          ? "Một hoặc nhiều ngày không còn chỗ. Vui lòng chọn lại."
          : "Ca sáng ngày hôm sau không còn chỗ. Vui lòng bỏ tùy chọn trả sáng hôm sau.",
      );
      return;
    }
    const pickupAt = resolvePickupAtIso();
    if (!pickupAt) {
      setError(
        pickupAtError ??
          "Thời gian nhận máy không hợp lệ. Vui lòng quay lại bước Nhận máy.",
      );
      return;
    }
    setPaying(true);
    setError(null);
    try {
      await requestCustomerBookingChange(changeSource.id, {
        phone: session.phone,
        cameraId: camera.id,
        lensId: lens?.id ?? null,
        startDate,
        endDate,
        slot: effectiveSlot,
        returnNextMorning,
        pickupAt,
        note: note || undefined,
        shippingAddress:
          canRequestDelivery && wantDelivery && shippingAddress.trim()
            ? shippingAddress.trim()
            : undefined,
      });
      router.push("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thay đổi được đơn");
      setPaying(false);
    }
  }

  async function handleEditPendingSubmit() {
    const session = getSession();
    if (
      !session ||
      !editSource ||
      !camera ||
      !startDate ||
      !endDate ||
      !effectiveSlot
    ) {
      return;
    }
    if (!bookingAvailabilityOk) {
      setError(
        rangeOk === false
          ? "Một hoặc nhiều ngày không còn chỗ. Vui lòng chọn lại."
          : "Ca sáng ngày hôm sau không còn chỗ. Vui lòng bỏ tùy chọn trả sáng hôm sau.",
      );
      return;
    }
    if (
      canRequestDelivery &&
      wantDelivery &&
      !shippingAddress.trim()
    ) {
      setError("Vui lòng nhập địa chỉ giao máy.");
      return;
    }
    const pickupAt = resolvePickupAtIso();
    if (!pickupAt) {
      setError(
        pickupAtError ??
          "Thời gian nhận máy không hợp lệ. Vui lòng quay lại bước Nhận máy.",
      );
      return;
    }
    setPaying(true);
    setError(null);
    try {
      await updatePendingCustomerBooking(editSource.id, {
        phone: session.phone,
        cameraId: camera.id,
        lensId: lens?.id ?? null,
        startDate,
        endDate,
        slot: effectiveSlot,
        returnNextMorning,
        pickupAt,
        note: note || undefined,
        shippingAddress:
          canRequestDelivery && wantDelivery && shippingAddress.trim()
            ? shippingAddress.trim()
            : null,
      });
      router.push(`/book/payment?bookingId=${editSource.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không sửa được đơn");
      setPaying(false);
    }
  }

  async function handlePay() {
    const session = getSession();
    if (!session || !camera || !startDate || !endDate || !effectiveSlot) return;
    if (!bookingAvailabilityOk) {
      setError(
        rangeOk === false
          ? "Một hoặc nhiều ngày không còn chỗ. Vui lòng chọn lại."
          : "Ca sáng ngày hôm sau không còn chỗ. Vui lòng bỏ tùy chọn trả sáng hôm sau.",
      );
      return;
    }
    if (
      canRequestDelivery &&
      wantDelivery &&
      !shippingAddress.trim()
    ) {
      setError("Vui lòng nhập địa chỉ giao máy.");
      return;
    }
    const pickupAt = resolvePickupAtIso();
    if (!pickupAt) {
      setError(
        pickupAtError ??
          "Thời gian nhận máy không hợp lệ. Vui lòng quay lại bước Nhận máy.",
      );
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const booking = await createCustomerBooking({
        customerId: session.id,
        cameraId: camera.id,
        lensId: lens?.id ?? null,
        startDate,
        endDate,
        slot: effectiveSlot,
        returnNextMorning,
        pickupAt,
        note: note || undefined,
        shippingAddress:
          canRequestDelivery && wantDelivery && shippingAddress.trim()
            ? shippingAddress.trim()
            : undefined,
      });
      router.push(`/book/payment?bookingId=${booking.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được đơn");
      setPaying(false);
    }
  }

  const stepsByCamera = [
    "Hãng",
    "Máy",
    "Ống kính",
    "Ngày",
    "Buổi",
    "Nhận máy",
    "Xác nhận",
  ];
  const stepsByDate = [
    "Ngày",
    "Buổi",
    "Hãng",
    "Máy",
    "Ống kính",
    "Nhận máy",
    "Xác nhận",
  ];
  const steps = mode === "BY_CAMERA" ? stepsByCamera : stepsByDate;
  const summaryStep = mode ? wizardSummaryStep(mode) : 6;
  const pickupStep = mode ? wizardPickupStep(mode) : 5;
  const brandStep = mode ? wizardBrandStep(mode) : 0;
  const isBrandStep = mode != null && step === wizardBrandStep(mode);
  const isCameraStep = mode != null && step === wizardCameraStep(mode);
  const isLensStep = mode != null && step === wizardLensStep(mode);
  const isPickupStep = mode != null && step === pickupStep && !!camera;

  function renderDateStepHeader() {
    return (
      <Stack gap={1} align="stretch">
        <Text fontSize="md" fontWeight="semibold" color={titleColor}>
          Ngày sử dụng máy
        </Text>
      </Stack>
    );
  }

  function renderDatePickupNotice() {
    return (
      <Text fontSize="sm" color="fg.muted" lineHeight="tall">
        <Text as="span" fontWeight="medium" color={titleColor}>
          Lưu ý:
        </Text>{" "}
        Khi thuê tối thiểu 1 ngày, bạn có thể lấy máy sớm từ đêm hôm trước ngày
        thuê. Riêng chủ nhật vui lòng nhận máy từ tối muộn thứ 7 hoặc sáng chủ nhật.
      </Text>
    );
  }

  const showSlotSkeleton = slotsLoading || slotAvailability === null;

  function renderSlotSkeletons() {
    return (
      <Stack gap={2} w="full" aria-busy="true" aria-label="Đang kiểm tra buổi">
        {SLOTS.map((s) => (
          <Skeleton key={s} w="full" h="12" borderRadius="md" />
        ))}
      </Stack>
    );
  }

  function renderSlotPicker() {
    if (forceFullDay) {
      const morningDate = endDate ? addDaysYmd(endDate, 1) : null;
      return (
        <Stack gap={3}>
          <Text fontSize="sm" color="fg.muted">
            Thuê từ 2 ngày trở lên chỉ áp dụng buổi Cả ngày.
          </Text>
          <Badge
            colorPalette="cerulean"
            size="lg"
            w="fit-content"
            minW="8rem"
            position="relative"
            pe={16}
          >
            <SlotHoursLabel slot="FULL_DAY" />
          </Badge>
          <Stack gap={1} align="stretch">
            <CheckboxRoot
              checked={returnNextMorning}
              disabled={
                !morningDate ||
                (camera !== null && morningNextDayAvailable === false)
              }
              onCheckedChange={(e) =>
                setReturnNextMorning(!!e.checked)
              }
            >
              <CheckboxHiddenInput />
              <CheckboxControl />
              <CheckboxLabel fontSize="sm">
                Trả trễ vào buổi sáng (trước 12h)
              </CheckboxLabel>
            </CheckboxRoot>
            {returnNextMorning && returnNextMorningSurcharge > 0 ? (
              <Text fontSize="xs" color="fg.muted" ps={6}>
                Phụ phí: +{vnd.format(returnNextMorningSurcharge)}
              </Text>
            ) : null}
            {camera && morningNextDayAvailable === false ? (
              <Text fontSize="xs" color="red.fg" ps={6}>
                Ca sáng ngày hôm sau đã hết chỗ cho máy này.
              </Text>
            ) : null}
          </Stack>
        </Stack>
      );
    }
    if (showSlotSkeleton) {
      return renderSlotSkeletons();
    }
    const morningDate =
      endDate && showReturnNextMorningOption ? addDaysYmd(endDate, 1) : null;

    return (
      <Stack gap={3}>
        <Stack gap={2}>
          {SLOTS.map((s) => {
            const unavailable = slotAvailability?.[s] === false;
            return (
              <Button
                key={s}
                w="full"
                size="lg"
                position="relative"
                {...(slot === s
                  ? {
                      variant: "solid" as const,
                      colorPalette: APP_COLOR_PALETTE,
                    }
                  : userOutlineButtonProps)}
                disabled={unavailable}
                opacity={unavailable ? 0.5 : 1}
                onClick={() => setSlot(s)}
              >
                <SlotHoursLabel slot={s} />
                {unavailable ? " (Hết chỗ)" : ""}
              </Button>
            );
          })}
        </Stack>
        {showReturnNextMorningOption ? (
          <Stack gap={1} align="stretch">
            <CheckboxRoot
              checked={returnNextMorning}
              disabled={
                !morningDate ||
                (camera !== null && morningNextDayAvailable === false)
              }
              onCheckedChange={(e) =>
                setReturnNextMorning(!!e.checked)
              }
            >
              <CheckboxHiddenInput />
              <CheckboxControl />
              <CheckboxLabel fontSize="sm">
                Trả trễ vào buổi sáng (trước 12h)
              </CheckboxLabel>
            </CheckboxRoot>
            {returnNextMorning && returnNextMorningSurcharge > 0 ? (
              <Text fontSize="xs" color="fg.muted" ps={6}>
                Phụ phí: +{vnd.format(returnNextMorningSurcharge)}
              </Text>
            ) : null}
            {camera && morningNextDayAvailable === false ? (
              <Text fontSize="xs" color="red.fg" ps={6}>
                Ca sáng ngày hôm sau đã hết chỗ cho máy này.
              </Text>
            ) : null}
            {!camera ? (
              <Text fontSize="xs" color="fg.muted" ps={6}>
                Chỗ trống ca sáng sẽ được kiểm tra sau khi chọn máy.
              </Text>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    );
  }

  function slotStepCanContinue(): boolean {
    if (slotsLoading || slotAvailability === null) return false;
    if (!slot || slotAvailability[slot] !== true) return false;
    if (returnNextMorning && camera) {
      if (morningNextDayAvailable !== true) return false;
    }
    return true;
  }

  const bookingAvailabilityOk =
    rangeOk !== false &&
    (!returnNextMorning || morningNextDayAvailable === true);

  function renderPickupTimeFields() {
    if (!startDate || !effectiveSlot || !pickupBounds) return null;
    return (
      <Stack gap={1} align="stretch">
        <PickupTimePicker
          startDate={startDate}
          slot={effectiveSlot}
          value={pickupAtLocal}
          onChange={handlePickupTimeChange}
        />
        {pickupAtError ? (
          <Text fontSize="sm" color="red.fg">
            {pickupAtError}
          </Text>
        ) : null}
        
        <Text fontSize="xs" mt={2} color="fg.muted" lineHeight="tall">
          Lưu ý: Trước khi qua lấy máy, xin vui lòng kiểm tra trạng thái sẵn sàng của máy ở trên đơn thuê.
        </Text>
      </Stack>
    );
  }

  function renderPickupStep() {
    return (
      <Stack gap={4}>
        <Stack gap={1} align="stretch">
          <Text fontSize="md" fontWeight="semibold" color={titleColor}>
            Thời gian nhận máy
          </Text>
        
        </Stack>
        {renderPickupTimeFields() ?? (
          <Text fontSize="sm" color="red.fg">
            Chưa đủ thông tin ngày/buổi thuê. Vui lòng quay lại bước trước.
          </Text>
        )}
        <Button
          {...userSolidButtonProps}
          {...STEP_CONTINUE_BUTTON_PROPS}
          disabled={!pickupAtLocal.trim()}
          onClick={() => tryAdvanceFromPickupStep(summaryStep)}
        >
          Tiếp tục
        </Button>
      </Stack>
    );
  }

  function renderSummary() {
    const isChange = !!changeSource;
    const isEditPending = !!editSource;
    const pickupDisplay = pickupAtLocal.trim()
      ? formatPickupAtLocalVi(pickupAtLocal)
      : null;
    return (
      <Stack gap={4}>
        <Stack gap={1} fontSize="sm">
          <HStack gap={2} align="center" flexWrap="wrap">
            <Text>
              <strong>Máy:</strong> {camera?.name}
            </Text>
            {discountPercent > 0 ? (
              <CameraDiscountBadge discountPercent={discountPercent} />
            ) : null}
          </HStack>
          <Text>
            <strong>Ống kính:</strong> {lensDisplayLabel(lens)}
          </Text>
          <Text>
            <strong>Ngày:</strong>{" "}
            {startDate && endDate
              ? formatBookingRangeLabel(startDate, endDate, dayCount)
              : "—"}
          </Text>
          {effectiveSlot ? (
            <HStack gap={2} fontSize="sm" align="center">
              <Text flexShrink={0}>
                <strong>Sử dụng:</strong>
              </Text>
              <Box flex={1} minW={0}>
                <SlotHoursLabel slot={effectiveSlot} variant="inline" />
              </Box>
            </HStack>
          ) : (
            <Text fontSize="sm">
              <strong>Sử dụng:</strong> —
            </Text>
          )}
          {pickupDisplay ? (
            <Text fontSize="sm">
              <strong>Nhận máy:</strong>{" "}
              <Text as="span" fontWeight="medium" color={titleColor}>
                {pickupDisplay}
              </Text>
            </Text>
          ) : null}
          {returnNextMorning && endDate ? (
            <Text fontSize="sm">
              <strong>Trả:</strong> Sáng ngày{" "}
              {(() => {
                const [, m, d] = addDaysYmd(endDate, 1).split("-");
                return `${d}/${m}`;
              })()}
            </Text>
          ) : null}

          <Box mt={2}>
          {isChange ? (
            <>
              {discountPercent > 0 ? (
                <DiscountedPriceLine
                  label="Tiền thuê mới:"
                  price={estimatedRental}
                  discountPercent={discountPercent}
                />
              ) : null}
              <Text fontWeight="bold" fontSize="md" color={titleColor}>
                Tổng tiền thuê mới: {vnd.format(estimatedAmount)}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Còn lại khi lấy máy: {vnd.format(changeBalanceDue)}
              </Text>
            </>
          ) : (
            <>
              
              {discountPercent > 0 ? (
                <DiscountedPriceLine
                  label="Tiền thuê:"
                  price={estimatedRental}
                  discountPercent={discountPercent}
                />
              ) : null}
              {deliverySelected ? (
                <Text fontSize="sm">
                  <strong>Giao & trả tận nơi:</strong>{" "}
                  {vnd.format(DELIVERY_FEE_VND)}
                </Text>
              ) : null}
              <Text fontWeight="bold" fontSize="md" color={titleColor}>
                Tổng: {vnd.format(estimatedAmount)}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Cọc online: {vnd.format(50_000)}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Còn lại khi nhận máy:{" "}
                {vnd.format(balanceDueVnd(estimatedAmount))}
              </Text>
            </>
          )}
          </Box>
        </Stack>
        {rangeOk === false ? (
          <Text color="red.fg" fontSize="sm">
            Một hoặc nhiều ngày trong khoảng đã hết chỗ.
          </Text>
        ) : null}
        {returnNextMorning && morningNextDayAvailable === false ? (
          <Text color="red.fg" fontSize="sm">
            Ca sáng ngày hôm sau đã hết chỗ cho máy này.
          </Text>
        ) : null}
        <Textarea
          placeholder="Ghi chú thêm (nếu có)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          {...userFieldInputProps}
        />
        {canRequestDelivery ? (
          <>
            <Stack gap={2} align="stretch">
              <CheckboxRoot
                size="sm"
                colorPalette={APP_COLOR_PALETTE}
                checked={wantDelivery}
                onCheckedChange={({ checked }) =>
                  setWantDelivery(checked === true)
                }
              >
                <CheckboxHiddenInput />
                <CheckboxControl
                  bg="white"
                  borderColor="cerulean.300"
                  _checked={{
                    bg: "colorPalette.solid",
                    borderColor: "colorPalette.solid",
                    color: "colorPalette.contrast",
                  }}
                />
                <CheckboxLabel fontSize="sm" color="fg.muted">
                  {getDeliveryAreaLabel()} (+
                  {vnd.format(DELIVERY_FEE_VND)})
                </CheckboxLabel>
              </CheckboxRoot>
            </Stack>
            <Textarea
              placeholder="Địa chỉ giao máy"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              disabled={!wantDelivery}
              opacity={!wantDelivery ? 0.55 : 1}
              {...userFieldInputProps}
            />
          </>
        ) : null}
        <Button
          colorPalette={APP_COLOR_PALETTE}
          size="lg"
          w="full"
          loading={paying}
          disabled={
            !effectiveSlot || !bookingAvailabilityOk || !pickupValidated
          }
          onClick={() =>
            void (
              isChange
                ? handleChangeSubmit()
                : isEditPending
                  ? handleEditPendingSubmit()
                  : handlePay()
            )
          }
        >
          {isChange
            ? "Xác nhận thay đổi"
            : isEditPending
              ? "Lưu & thanh toán cọc"
              : "Xác nhận & thanh toán cọc"}
        </Button>
      </Stack>
    );
  }

  if (changeLoading) {
    return (
      <Text color="fg.muted" textAlign="center" py={8}>
        Đang tải đơn…
      </Text>
    );
  }

  if (!mode) {
    return (
      <Stack gap={6} py={4}>
        <Text textStyle="xl" fontWeight="bold" color={titleColor}>
          {changeSource
            ? "Thay đổi đặt lịch"
            : editSource
              ? "Chỉnh sửa đơn"
              : "Đặt lịch thuê máy"}
        </Text>
        {changeSource || editSource ? (
          <Text fontSize="sm" color="fg.muted">
            Đơn {(changeSource ?? editSource)!.bookingCode} — chọn lại hãng,
            máy, ngày và buổi.
          </Text>
        ) : null}
        {error ? (
          <Text color="red.fg" fontSize="sm">
            {error}
          </Text>
        ) : null}
        <Button
          size="lg"
          colorPalette={APP_COLOR_PALETTE}
          onClick={() => resetWizard("BY_CAMERA")}
        >
          Đặt theo máy
        </Button>
        <Button
          size="lg"
          {...userOutlineButtonProps}
          onClick={() => resetWizard("BY_DATE")}
        >
          Đặt theo ngày
        </Button>
        <BookStepFooter
          onBack={() => router.push("/home")}
          backLabel={
            changeSource || editSource ? "Huỷ chỉnh sửa" : "Quay lại"
          }
        />
      </Stack>
    );
  }

  const handleWizardBack = () => {
    if (step > 0) {
      setStep((s) => Math.max(0, s - 1));
      return;
    }
    if (changeSource || editSource) {
      router.push("/home");
      return;
    }
    setMode(null);
  };

  return (
    <Stack gap={4} pb={8}>
      <HStack justify="space-between">
        <Text textStyle="lg" fontWeight="bold" color={titleColor}>
          {changeSource
            ? "Thay đổi đặt lịch"
            : editSource
              ? "Chỉnh sửa đơn"
              : mode === "BY_CAMERA"
                ? "Theo máy"
                : "Theo ngày"}
        </Text>
        <Badge variant="subtle">{steps[step]}</Badge>
      </HStack>

      {error ? (
        <Text color="red.fg" fontSize="sm">
          {error}
        </Text>
      ) : null}

      {isBrandStep ? (
        <>
          <Text fontSize="sm" color="fg.muted">
            Chọn hãng để tiếp tục đặt lịch.
          </Text>
          <Stack gap={2}>
            {brandOptions.length === 0 ? (
              <Text fontSize="sm" color="fg.muted">
                Đang tải hãng…
              </Text>
            ) : null}
            {brandOptions.map((b) => (
              <BrandPickerButton
                key={b.id}
                brand={b}
                onClick={() => {
                  setBrand(b.id);
                  setLens(null);
                  setCamera(null);
                  if (mode === "BY_CAMERA") {
                    void loadCamerasForBrand(b.id);
                    setStep(wizardCameraStep("BY_CAMERA"));
                  } else {
                    void loadCamerasAvail(b.id);
                    setStep(wizardCameraStep("BY_DATE"));
                  }
                }}
              />
            ))}
          </Stack>
        </>
      ) : null}

      {isCameraStep && brand ? (
        <>
          <Button
            size="sm"
            w="fit-content"
            variant="ghost"
            colorPalette={APP_COLOR_PALETTE}
            onClick={() => {
              setStep(brandStep);
              setCamera(null);
              setLens(null);
              setLenses([]);
            }}
          >
            ← Chọn hãng khác
          </Button>
          <Text fontSize="sm" color="fg.muted">
            Máy {BRAND_LABEL[brand]} — chọn máy để tiếp tục.
          </Text>
          {loading ? (
            <Text color="fg.muted" fontSize="sm">
              Đang tải…
            </Text>
          ) : null}
          {mode === "BY_CAMERA" &&
          !loading &&
          cameras.length === 0 ? (
            <CardRoot {...userCardProps}>
              <CardBody>
                <Text color="fg.muted" textAlign="center" fontSize="sm">
                  Chưa có máy {BRAND_LABEL[brand]}.
                </Text>
              </CardBody>
            </CardRoot>
          ) : null}
          {mode === "BY_DATE" &&
          !loading &&
          camerasAvail.length === 0 ? (
            <CardRoot {...userCardProps}>
              <CardBody>
                <Text color="fg.muted" textAlign="center" fontSize="sm">
                  Chưa có máy {BRAND_LABEL[brand]} khả dụng trong khoảng ngày
                  đã chọn.
                </Text>
              </CardBody>
            </CardRoot>
          ) : null}
          <Stack gap={3}>
            {mode === "BY_CAMERA"
              ? cameras.map((c) => (
                  <CameraPickerCard
                    key={c.id}
                    camera={c}
                    onClick={() => {
                      if (!mode) return;
                      void advanceAfterCameraSelect(c, "BY_CAMERA");
                    }}
                  />
                ))
              : camerasAvail.map((c) => (
                  <CameraPickerCard
                    key={c.id}
                    camera={c}
                    disabled={!c.available}
                    unavailableLabel={
                      !c.available ? "Hết chỗ" : undefined
                    }
                    onClick={() => {
                      if (!mode) return;
                      void advanceAfterCameraSelect(c, "BY_DATE");
                    }}
                  />
                ))}
          </Stack>
        </>
      ) : null}

      {isLensStep && camera ? (
        <>
          <Button
            size="sm"
            w="fit-content"
            variant="ghost"
            colorPalette={APP_COLOR_PALETTE}
            onClick={() => {
              if (!mode) return;
              setLens(null);
              setStep(wizardCameraStep(mode));
            }}
          >
            ← Chọn máy khác
          </Button>
          <Text fontSize="sm" color="fg.muted">
            Ống kính cho {camera.name} — chọn để tiếp tục.
          </Text>
          {loading ? (
            <Text color="fg.muted" fontSize="sm">
              Đang tải…
            </Text>
          ) : null}
          <Stack gap={3}>
            {lenses.map((l) => (
              <CameraPickerCard
                key={l.id}
                camera={l}
                showFreePriceLabel
                onClick={() => {
                  if (!mode) return;
                  setLens(l);
                  setStep(wizardStepAfterLens(mode));
                }}
              />
            ))}
          </Stack>
        </>
      ) : null}

      {!isBrandStep && !isCameraStep && !isLensStep ? (
        <CardRoot {...userCardProps}>
          <CardBody>
          {mode === "BY_CAMERA" &&
            step === WIZARD_STEP.BY_CAMERA.DATE &&
            camera && (
            <Stack gap={4}>
              {renderDateStepHeader()}
              <MonthCalendar
                year={ym.year}
                month={ym.month}
                days={calendarDays}
                startDate={startDate}
                endDate={endDate}
                onRangeChange={handleRangeChange}
              />
              {startDate && endDate && dayCount >= 2 ? (
                <Text fontSize="sm" textAlign="center">
                  {dayCount} ngày
                </Text>
              ) : null}
              {forceFullDay && slotsLoading ? (
                <Text fontSize="sm" color="fg.muted" textAlign="center">
                  Đang kiểm tra buổi…
                </Text>
              ) : null}
              {forceFullDay &&
              slotAvailability?.FULL_DAY === false &&
              !slotsLoading ? (
                <Text color="red.fg" fontSize="sm" textAlign="center">
                  Buổi Cả ngày đã hết chỗ trong khoảng ngày đã chọn.
                </Text>
              ) : null}
              <Button
                {...userSolidButtonProps}
                {...STEP_CONTINUE_BUTTON_PROPS}
                disabled={!startDate || !endDate || !fullDayCanContinue}
                onClick={() => setStep(WIZARD_STEP.BY_CAMERA.SLOT)}
              >
                Tiếp tục
              </Button>
            </Stack>
          )}

          {mode === "BY_CAMERA" && step === WIZARD_STEP.BY_CAMERA.SLOT && (
            <Stack gap={4}>
              {renderSlotPicker()}
              <Button
                {...userSolidButtonProps}
                {...STEP_CONTINUE_BUTTON_PROPS}
                disabled={!slotStepCanContinue()}
                onClick={() => advanceFromSlotStep(pickupStep)}
              >
                Tiếp tục
              </Button>
            </Stack>
          )}

          {mode === "BY_CAMERA" && isPickupStep && renderPickupStep()}

          {mode === "BY_CAMERA" && step === summaryStep && renderSummary()}

          {mode === "BY_DATE" && step === WIZARD_STEP.BY_DATE.DATE && (
            <Stack gap={4}>
              {renderDateStepHeader()}
              <MonthCalendar
                year={ym.year}
                month={ym.month}
                startDate={startDate}
                endDate={endDate}
                onRangeChange={handleRangeChange}
                allowUnavailableDays
              />
              {startDate && endDate && dayCount >= 2 ? (
                <Text fontSize="sm" textAlign="center">
                  {dayCount} ngày
                </Text>
              ) : null}
              {forceFullDay && slotsLoading ? (
                <Text fontSize="sm" color="fg.muted" textAlign="center">
                  Đang kiểm tra buổi…
                </Text>
              ) : null}
              {forceFullDay &&
              slotAvailability?.FULL_DAY === false &&
              !slotsLoading ? (
                <Text color="red.fg" fontSize="sm" textAlign="center">
                  Buổi Cả ngày đã hết chỗ trong khoảng ngày đã chọn.
                </Text>
              ) : null}
              <Button
                {...userSolidButtonProps}
                {...STEP_CONTINUE_BUTTON_PROPS}
                disabled={!startDate || !endDate || !fullDayCanContinue}
                onClick={() => setStep(WIZARD_STEP.BY_DATE.SLOT)}
              >
                Tiếp tục
              </Button>
            </Stack>
          )}

          {mode === "BY_DATE" && step === WIZARD_STEP.BY_DATE.SLOT && (
            <Stack gap={4}>
              {renderSlotPicker()}
              <Button
                {...userSolidButtonProps}
                {...STEP_CONTINUE_BUTTON_PROPS}
                disabled={!slotStepCanContinue()}
                onClick={() => advanceFromSlotStep(wizardBrandStep("BY_DATE"))}
              >
                Tiếp tục
              </Button>
            </Stack>
          )}

          {mode === "BY_DATE" && isPickupStep && renderPickupStep()}

          {mode === "BY_DATE" && step === summaryStep && renderSummary()}
          </CardBody>
        </CardRoot>
      ) : null}

      <BookStepFooter onBack={handleWizardBack} />
    </Stack>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <Text textAlign="center" py={8} color="fg.muted">
          Đang tải…
        </Text>
      }
    >
      <BookPageContent />
    </Suspense>
  );
}
