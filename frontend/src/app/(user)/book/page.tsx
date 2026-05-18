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
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { BrandPickerButton } from "@/components/camera/brand-picker-button";
import { CameraPickerCard } from "@/components/camera/camera-picker-card";
import { MonthCalendar } from "@/components/booking/month-calendar";
import { SlotHoursLabel } from "@/components/booking/slot-hours-label";
import { BRAND_LABEL, CAMERA_BRAND_OPTIONS } from "@/lib/camera-brands";
import {
  createCustomerBooking,
  dayCountInclusive,
  fetchCalendarMonth,
  fetchCamerasForRange,
  fetchPublicCamera,
  fetchPublicCameras,
  fetchRangeAvailability,
  fetchRangeSlotsAnyAvailability,
  fetchRangeSlotsAvailability,
  formatBookingRangeLabel,
  type BookingSlot,
  type CameraBrand,
  type CameraWithAvailability,
  type PublicCamera,
} from "@/lib/booking-api";
import {
  fetchCustomerVerification,
  fetchMyBookings,
  requestCustomerBookingChange,
  type MyBooking,
} from "@/lib/api";
import { DELIVERY_FEE_VND } from "@/lib/booking-status";
import { rentalAmountVnd } from "@/lib/rental-pricing";
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
  const preselectCameraId = searchParams.get("cameraId");
  const [changeSource, setChangeSource] = useState<MyBooking | null>(null);
  const [changeLoading, setChangeLoading] = useState(!!changeBookingId);
  const [changeBankInfo, setChangeBankInfo] = useState("");
  const [mode, setMode] = useState<Mode>(null);
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState<CameraBrand | null>(null);
  const [camera, setCamera] = useState<PublicCamera | null>(null);
  const [cameras, setCameras] = useState<PublicCamera[]>([]);
  const [camerasAvail, setCamerasAvail] = useState<CameraWithAvailability[]>(
    [],
  );
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<BookingSlot | null>("FULL_DAY");
  const [note, setNote] = useState("");
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
    if (changeBookingId || !preselectCameraId) return;
    void fetchPublicCamera(preselectCameraId)
      .then((cam) => {
        setMode("BY_CAMERA");
        setBrand(cam.brand);
        setCamera(cam);
        setStep(2);
      })
      .catch(() => {
        setError("Không tải được thông tin máy đã chọn.");
      });
  }, [changeBookingId, preselectCameraId]);

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

  const estimatedAmount = useMemo(() => {
    if (!camera || !effectiveSlot || dayCount < 1) return 0;
    const rental = rentalAmountVnd(
      dayCount,
      camera.dayPrice,
      camera.shiftPrice,
      effectiveSlot,
    );
    const delivery = deliverySelected ? DELIVERY_FEE_VND : 0;
    return rental + delivery;
  }, [camera, effectiveSlot, dayCount, deliverySelected]);

  const loadCalendar = useCallback(
    async (cameraId: string) => {
      const data = await fetchCalendarMonth(cameraId, ym.year, ym.month);
      setCalendarDays(data.days);
    },
    [ym.year, ym.month],
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
          (x) => x.id === changeBookingId && x.status === "CONFIRMED",
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
    if (forceFullDay) setSlot("FULL_DAY");
  }, [forceFullDay]);

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
      changeSource?.id,
    )
      .then((r) => setRangeOk(r.available))
      .catch(() => setRangeOk(false));
  }, [camera, startDate, endDate, effectiveSlot, changeSource?.id]);

  const onSlotStep =
    (mode === "BY_CAMERA" && step === 3 && !!camera) ||
    (mode === "BY_DATE" && step === 1);
  const onDateStepForceFullDay =
    forceFullDay &&
    !!startDate &&
    !!endDate &&
    ((mode === "BY_CAMERA" && step === 2 && !!camera) ||
      (mode === "BY_DATE" && step === 0));

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
        const excludeId = changeSource?.id;
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
    changeSource?.id,
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
        changeSource?.id,
      );
      setCamerasAvail(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải máy");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode !== "BY_CAMERA" || step !== 1 || !brand) return;
    void loadCamerasForBrand(brand);
  }, [mode, step, brand]);

  useEffect(() => {
    if (mode !== "BY_DATE" || step !== 3 || !brand) return;
    if (!startDate || !endDate || !effectiveSlot) return;
    void loadCamerasAvail(brand);
  }, [mode, step, brand, startDate, endDate, effectiveSlot]);

  function resetWizard(m: Mode) {
    setMode(m);
    setStep(0);
    setBrand(null);
    setCamera(null);
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
  }

  function handleRangeChange(s: string, e: string) {
    setStartDate(s);
    setEndDate(e);
    if (dayCountInclusive(s, e) >= 2) setSlot("FULL_DAY");
  }

  const changeDelta = useMemo(() => {
    if (!changeSource) return 0;
    return estimatedAmount - changeSource.amount;
  }, [changeSource, estimatedAmount]);

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
    if (rangeOk === false) {
      setError("Một hoặc nhiều ngày không còn chỗ. Vui lòng chọn lại.");
      return;
    }
    if (changeDelta < 0 && !changeBankInfo.trim()) {
      setError("Vui lòng nhập tài khoản ngân hàng để nhận hoàn chênh lệch.");
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const result = await requestCustomerBookingChange(changeSource.id, {
        phone: session.phone,
        cameraId: camera.id,
        startDate,
        endDate,
        slot: effectiveSlot,
        note: note || undefined,
        shippingAddress:
          canRequestDelivery && wantDelivery && shippingAddress.trim()
            ? shippingAddress.trim()
            : undefined,
        bankAccountInfo:
          changeDelta < 0 ? changeBankInfo.trim() : undefined,
      });
      if (result.needsPayment) {
        router.push(`/book/payment?bookingId=${changeSource.id}`);
        return;
      }
      router.push("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thay đổi được đơn");
      setPaying(false);
    }
  }

  async function handlePay() {
    const session = getSession();
    if (!session || !camera || !startDate || !endDate || !effectiveSlot) return;
    if (rangeOk === false) {
      setError("Một hoặc nhiều ngày không còn chỗ. Vui lòng chọn lại.");
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
    setPaying(true);
    setError(null);
    try {
      const booking = await createCustomerBooking({
        customerId: session.id,
        cameraId: camera.id,
        startDate,
        endDate,
        slot: effectiveSlot,
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
    "Ngày",
    "Buổi",
    "Xác nhận",
  ];
  const stepsByDate = ["Ngày", "Buổi", "Hãng", "Máy", "Xác nhận"];
  const steps = mode === "BY_CAMERA" ? stepsByCamera : stepsByDate;
  const brandStep = mode === "BY_CAMERA" ? 0 : 2;
  const isBrandStep =
    (mode === "BY_CAMERA" && step === 0) ||
    (mode === "BY_DATE" && step === 2);
  const isCameraStep =
    (mode === "BY_CAMERA" && step === 1) ||
    (mode === "BY_DATE" && step === 3);

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

  function renderSlotPicker() {
    if (forceFullDay) {
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
        </Stack>
      );
    }
    return (
      <Stack gap={2}>
        {slotsLoading ? (
          <Text fontSize="sm" color="fg.muted">
            Đang kiểm tra buổi…
          </Text>
        ) : null}
        <Stack gap={2}>
          {SLOTS.map((s) => {
            const unavailable =
              slotsLoading || slotAvailability?.[s] === false;
            return (
              <Button
                key={s}
                w="full"
                size="lg"
                position="relative"
                {...(slot === s
                  ? { variant: "solid" as const, colorPalette: APP_COLOR_PALETTE }
                  : userOutlineButtonProps)}
                disabled={unavailable}
                opacity={unavailable ? 0.5 : 1}
                onClick={() => setSlot(s)}
              >
                <SlotHoursLabel slot={s} />
                {slotAvailability?.[s] === false ? " (Hết chỗ)" : ""}
              </Button>
            );
          })}
        </Stack>
      </Stack>
    );
  }

  function slotStepCanContinue(): boolean {
    if (slotsLoading || slotAvailability === null) return false;
    return !!slot && slotAvailability[slot] === true;
  }

  function renderSummary() {
    const isChange = !!changeSource;
    return (
      <Stack gap={4}>
        <Text color="fg.muted" fontSize="sm">
          {isChange
            ? changeDelta > 0
              ? "Xác nhận thay đổi lịch. Bạn chuyển thêm phần chênh lệch qua SePay."
              : changeDelta < 0
                ? "Xác nhận thay đổi. Cửa hàng sẽ hoàn phần chênh lệch theo tài khoản bạn nhập."
                : "Xác nhận thay đổi. Giá không đổi — không cần thanh toán thêm."
            : "Máy được giữ sau khi thanh toán thành công."}
        </Text>
        <Stack gap={1} fontSize="sm">
          <Text>
            <strong>Máy:</strong> {camera?.name}
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
                <strong>Thời gian:</strong>
              </Text>
              <Box flex={1} minW={0}>
                <SlotHoursLabel slot={effectiveSlot} variant="inline" />
              </Box>
            </HStack>
          ) : (
            <Text fontSize="sm">
              <strong>Thời gian:</strong> —
            </Text>
          )}
          {isChange ? (
            <>
              <Text>
                <strong>Giá hiện tại:</strong>{" "}
                {vnd.format(changeSource.amount)}
              </Text>
              <Text>
                <strong>Giá mới:</strong> {vnd.format(estimatedAmount)}
              </Text>
              <Text fontWeight="bold" color={titleColor}>
                Chênh lệch:{" "}
                {changeDelta >= 0 ? "+" : ""}
                {vnd.format(changeDelta)}
              </Text>
            </>
          ) : (
            <>
              {deliverySelected ? (
                <Text fontSize="sm">
                  <strong>Giao & trả tận nơi:</strong>{" "}
                  {vnd.format(DELIVERY_FEE_VND)}
                </Text>
              ) : null}
              <Text fontWeight="bold" fontSize="md" color={titleColor}>
                Tổng: {vnd.format(estimatedAmount)}
              </Text>
            </>
          )}
        </Stack>
        {rangeOk === false ? (
          <Text color="red.fg" fontSize="sm">
            Một hoặc nhiều ngày trong khoảng đã hết chỗ.
          </Text>
        ) : null}
         
          <Textarea
            placeholder="Ghi chú — ví dụ: nhận máy lúc 19:00"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            {...userFieldInputProps}
          />
        <Stack gap={2} align="stretch">
          <CheckboxRoot
            size="sm"
            colorPalette={APP_COLOR_PALETTE}
            checked={canRequestDelivery ? wantDelivery : false}
            disabled={!canRequestDelivery}
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
              Giao & trả máy tận nơi Long Khánh (+{vnd.format(DELIVERY_FEE_VND)})
            </CheckboxLabel>
          </CheckboxRoot>
          {!canRequestDelivery ? (
            <Text fontSize="xs" color="fg.muted">
              Giao hàng chỉ áp dụng với tài khoản đã xác minh. Liên hệ fanpage để xác minh.
            </Text>
          ) : null}
        </Stack>
        <Textarea
          placeholder="Địa chỉ giao máy"
          value={shippingAddress}
          onChange={(e) => setShippingAddress(e.target.value)}
          disabled={!canRequestDelivery || !wantDelivery}
          opacity={!canRequestDelivery || !wantDelivery ? 0.55 : 1}
          {...userFieldInputProps}
        />
        {isChange && changeDelta < 0 ? (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Tài khoản nhận hoàn chênh lệch
            </Text>
            <Textarea
              placeholder="Số TK, ngân hàng, tên chủ TK…"
              value={changeBankInfo}
              rows={3}
              onChange={(e) => setChangeBankInfo(e.target.value)}
              {...userFieldInputProps}
            />
          </Box>
        ) : null}
        <Button
          colorPalette={APP_COLOR_PALETTE}
          size="lg"
          w="full"
          loading={paying}
          disabled={!effectiveSlot || rangeOk === false}
          onClick={() =>
            void (isChange ? handleChangeSubmit() : handlePay())
          }
        >
          {isChange
            ? changeDelta > 0
              ? "Xác nhận & thanh toán chênh lệch"
              : "Xác nhận thay đổi"
            : "Xác nhận & thanh toán"}
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
          {changeSource ? "Thay đổi đặt lịch" : "Đặt lịch thuê máy"}
        </Text>
        {changeSource ? (
          <Text fontSize="sm" color="fg.muted">
            Đơn {changeSource.bookingCode} — chọn lại hãng, máy, ngày và buổi.
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
        <Button asChild variant="ghost" size="sm">
          <NextLink href="/home">
            {changeSource ? "Huỷ thay đổi" : "Quay lại"}
          </NextLink>
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap={4} pb={8}>
      <HStack justify="space-between">
        <Text textStyle="lg" fontWeight="bold" color={titleColor}>
          {changeSource
            ? "Thay đổi đặt lịch"
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
            {CAMERA_BRAND_OPTIONS.map((b) => (
              <BrandPickerButton
                key={b.id}
                brand={b}
                onClick={() => {
                  setBrand(b.id);
                  if (mode === "BY_CAMERA") {
                    void loadCamerasForBrand(b.id);
                    setStep(1);
                  } else {
                    void loadCamerasAvail(b.id);
                    setStep(3);
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
                      setCamera(c);
                      setStep(2);
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
                      setCamera(c);
                      setStep(4);
                    }}
                  />
                ))}
          </Stack>
        </>
      ) : null}

      {!isBrandStep && !isCameraStep ? (
        <CardRoot {...userCardProps}>
          <CardBody>
          {mode === "BY_CAMERA" && step === 2 && camera && (
            <Stack gap={4}>
              {renderDatePickupNotice()}
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
                disabled={!startDate || !endDate || !fullDayCanContinue}
                onClick={() => setStep(forceFullDay ? 4 : 3)}
              >
                Tiếp tục
              </Button>
            </Stack>
          )}

          {mode === "BY_CAMERA" && step === 3 && (
            <Stack gap={4}>
              {renderSlotPicker()}
              <Button
                {...userSolidButtonProps}
                disabled={!slotStepCanContinue()}
                onClick={() => setStep(4)}
              >
                Tiếp tục
              </Button>
            </Stack>
          )}

          {mode === "BY_CAMERA" && step === 4 && renderSummary()}

          {mode === "BY_DATE" && step === 0 && (
            <Stack gap={4}>
              {renderDatePickupNotice()}
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
                disabled={!startDate || !endDate || !fullDayCanContinue}
                onClick={() => setStep(forceFullDay ? 2 : 1)}
              >
                Tiếp tục
              </Button>
            </Stack>
          )}

          {mode === "BY_DATE" && step === 1 && (
            <Stack gap={4}>
              {renderSlotPicker()}
              <Button
                {...userSolidButtonProps}
                disabled={!slotStepCanContinue()}
                onClick={() => setStep(2)}
              >
                Tiếp tục
              </Button>
            </Stack>
          )}

          {mode === "BY_DATE" && step === 4 && renderSummary()}
          </CardBody>
        </CardRoot>
      ) : null}

      <HStack>
        {step > 0 ? (
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Quay lại
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setMode(null)}>
            Quay lại
          </Button>
        )}
      </HStack>
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
