"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  HStack,
  Image,
  Skeleton,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { YoutubeEmbed } from "@/components/camera/youtube-embed";
import { fetchMyBookings } from "@/lib/api";
import {
  fetchPublicCamera,
  fetchSepayInstructions,
  type SepayInstructions,
} from "@/lib/booking-api";
import { BOOKING_DEPOSIT_VND } from "@/lib/booking-payment";
import { getSession } from "@/lib/customer-session";
import {
  APP_COLOR_PALETTE,
  titleColor,
  userCardProps,
  userOutlineButtonProps,
} from "@/lib/user-theme";

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const POLL_MS = 4000;
const MAX_POLL_MS = 180000;

const QR_IMAGE_SIZE = 280;
const QR_BOX_PADDING = 12;
const QR_BOX_MAX_W = QR_IMAGE_SIZE + QR_BOX_PADDING * 2;

function QrCodeCard({ imageUrl }: { imageUrl: string }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [imageUrl]);

  return (
    <Box
      mx="auto"
      p={3}
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="cerulean.200"
      w="full"
      maxW={`${QR_BOX_MAX_W}px`}
      boxSizing="border-box"
    >
      <Box
        position="relative"
        w={`${QR_IMAGE_SIZE}px`}
        h={`${QR_IMAGE_SIZE}px`}
        maxW="100%"
        mx="auto"
      >
        {!loaded ? (
          <Skeleton
            position="absolute"
            inset={0}
            w="full"
            h="full"
            borderRadius="md"
          />
        ) : null}
        <Image
          src={imageUrl}
          alt="Mã QR chuyển khoản"
          position="absolute"
          inset={0}
          w="full"
          h="full"
          objectFit="contain"
          opacity={loaded ? 1 : 0}
          transition="opacity 0.2s"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      </Box>
    </Box>
  );
}

function PaymentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params.get("bookingId") ?? "";

  const [instructions, setInstructions] = useState<SepayInstructions | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "loading" | "pay" | "success" | "timeout" | "already"
  >("loading");
  const [copied, setCopied] = useState(false);
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState<string | null>(null);

  const loadInstructions = useCallback(async () => {
    const session = getSession();
    if (!session || !bookingId) {
      router.replace("/");
      return;
    }
    setError(null);
    try {
      const data = await fetchSepayInstructions(bookingId, session.phone);
      setInstructions(data);
      if (data.alreadyPaid) {
        setPhase("already");
        return;
      }
      if (data.paymentKind === "DEPOSIT_DONE") {
        setPhase("already");
        return;
      }
      if (data.paymentKind === "DEPOSIT" && data.qrImageUrl) {
        setPhase("pay");
        return;
      }
      setError("Đơn không ở trạng thái chờ cọc.");
      setPhase("pay");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được thông tin CK");
      setPhase("pay");
    }
  }, [bookingId, router]);

  useEffect(() => {
    void loadInstructions();
  }, [loadInstructions]);

  useEffect(() => {
    const cameraId = instructions?.cameraId;
    if (phase !== "success" && phase !== "already") {
      setTutorialVideoUrl(null);
      return;
    }
    if (!cameraId) {
      setTutorialVideoUrl(null);
      return;
    }

    let cancelled = false;
    void fetchPublicCamera(cameraId)
      .then((camera) => {
        if (!cancelled) setTutorialVideoUrl(camera.tutorialVideoUrl);
      })
      .catch(() => {
        if (!cancelled) setTutorialVideoUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [phase, instructions?.cameraId]);

  useEffect(() => {
    if (phase !== "pay") return;
    const session = getSession();
    if (!session || !bookingId) return;

    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const list = await fetchMyBookings(session.phone);
        const found = list.find((b) => b.id === bookingId);
        if (
          found?.status === "CONFIRMED" &&
          found.paymentStatus === "DEPOSITED"
        ) {
          setPhase("success");
          return;
        }
      } catch {
        /* keep polling */
      }
      if (Date.now() - started >= MAX_POLL_MS) {
        setPhase("timeout");
        return;
      }
      timer = setTimeout(() => void poll(), POLL_MS);
    };

    timer = setTimeout(() => void poll(), POLL_MS);
    return () => clearTimeout(timer);
  }, [phase, bookingId]);

  async function copyTransferContent() {
    const text = instructions?.transferContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Không sao chép được. Vui lòng chọn và copy thủ công.");
    }
  }

  if (!bookingId) {
    return (
      <Text color="red.fg" textAlign="center" py={8}>
        Thiếu mã đơn. Quay lại trang chủ.
      </Text>
    );
  }

  if (phase === "loading") {
    return (
      <Stack align="center" py={12} gap={3}>
        <Spinner size="lg" color="cerulean.600" />
        <Text color="fg.muted">Đang tải thông tin thanh toán…</Text>
      </Stack>
    );
  }

  if (phase === "success" || phase === "already") {
    const balanceDue = instructions?.balanceDue ?? 0;
    return (
      <CardRoot {...userCardProps}>
        <CardBody>
          <Stack gap={4} py={4}>
            <Stack gap={2} textAlign="center">
              <Text textStyle="xl" fontWeight="bold" color={titleColor}>
                {instructions?.paymentKind === "DEPOSIT_DONE"
                  ? "Đơn đã được cọc"
                  : "Đặt lịch thành công"}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Đơn {instructions?.bookingCode ?? ""} — máy đã được giữ lịch.
              </Text>
              {balanceDue > 0 ? (
                <Text fontSize="sm" color={titleColor} fontWeight="medium">
                  Còn lại khi nhận máy: {vnd.format(balanceDue)} (chuyển khoản
                  hoặc tiền mặt).
                </Text>
              ) : null}
              <Text fontSize="xs" color="fg.muted" lineHeight="tall" textAlign="left">
                Bạn có thể đến sớm hơn giờ nhận máy đã chọn (nếu phù hợp). Vui
                lòng tự sạc pin sau khi nhận máy.
              </Text>
            </Stack>
            {tutorialVideoUrl ? (
              <Stack gap={2} w="full" textAlign="left">
                <Text fontWeight="semibold" color={titleColor} fontSize="sm">
                  Hướng dẫn sử dụng máy
                </Text>
                <YoutubeEmbed
                  url={tutorialVideoUrl}
                  title="Hướng dẫn sử dụng máy"
                />
              </Stack>
            ) : null}
            <Button
              asChild
              {...userOutlineButtonProps}
              w="full"
              size="lg"
            >
              <NextLink href="/home">Về trang chủ</NextLink>
            </Button>
          </Stack>
        </CardBody>
      </CardRoot>
    );
  }

  if (phase === "timeout") {
    return (
      <CardRoot {...userCardProps}>
        <CardBody>
          <Stack gap={4} textAlign="center" py={4}>
            <Text textStyle="lg" fontWeight="semibold" color={titleColor}>
              Chưa nhận được thanh toán cọc
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Kiểm tra lại số tiền ({vnd.format(BOOKING_DEPOSIT_VND)}) và nội
              dung chuyển khoản, hoặc liên hệ cửa hàng nếu đã chuyển tiền.
            </Text>
            <Button
              colorPalette={APP_COLOR_PALETTE}
              w="full"
              onClick={() => {
                setPhase("pay");
                void loadInstructions();
              }}
            >
              Thử lại
            </Button>
            <Button asChild {...userOutlineButtonProps} w="full">
              <NextLink href="/home">Về trang chủ</NextLink>
            </Button>
          </Stack>
        </CardBody>
      </CardRoot>
    );
  }

  const totalAmount = instructions?.totalAmount ?? 0;
  const balanceDue = instructions?.balanceDue ?? 0;

  return (
    <Stack gap={4} pb={8}>
      <Text textStyle="xl" fontWeight="bold" color={titleColor}>
        Thanh toán cọc giữ lịch
      </Text>
      <Text fontSize="sm" color="fg.muted">
        Chuyển khoản cọc {vnd.format(BOOKING_DEPOSIT_VND)} qua QR bên dưới.
        Phần còn lại ({vnd.format(balanceDue)}) thanh toán khi nhận máy.
      </Text>

      {error ? (
        <Text color="red.fg" fontSize="sm">
          {error}
        </Text>
      ) : null}

      {instructions?.qrImageUrl ? (
        <QrCodeCard imageUrl={instructions.qrImageUrl} />
      ) : null}

      <CardRoot {...userCardProps}>
        <CardBody>
          <Stack gap={3} fontSize="sm">
            <HStack justify="space-between">
              <Text color="fg.muted">Cọc giữ lịch</Text>
              <Text fontWeight="bold" color={titleColor}>
                {instructions ? vnd.format(instructions.amount) : "—"}
              </Text>
            </HStack>
            {totalAmount > 0 ? (
              <HStack justify="space-between">
                <Text color="fg.muted">Tổng tiền thuê</Text>
                <Text>{vnd.format(totalAmount)}</Text>
              </HStack>
            ) : null}
            {balanceDue > 0 ? (
              <HStack justify="space-between">
                <Text color="fg.muted">Còn lại khi lấy máy</Text>
                <Text fontWeight="medium" color={titleColor}>
                  {vnd.format(balanceDue)}
                </Text>
              </HStack>
            ) : null}
            <HStack justify="space-between" align="flex-start">
              <Text color="fg.muted">Ngân hàng</Text>
              <Text textAlign="right">{instructions?.bankName ?? "—"}</Text>
            </HStack>
            <HStack justify="space-between" align="flex-start">
              <Text color="fg.muted">Số tài khoản</Text>
              <Text fontWeight="medium" textAlign="right">
                {instructions?.accountNumber ?? "—"}
              </Text>
            </HStack>
            <HStack justify="space-between" align="flex-start">
              <Text color="fg.muted">Chủ tài khoản</Text>
              <Text textAlign="right">{instructions?.accountName ?? "—"}</Text>
            </HStack>
            <Stack gap={1}>
              <Text color="fg.muted">Nội dung chuyển khoản</Text>
              <HStack gap={2}>
                <Text
                  flex={1}
                  fontWeight="bold"
                  fontFamily="mono"
                  color={titleColor}
                  wordBreak="break-all"
                >
                  {instructions?.transferContent ?? "—"}
                </Text>
                <Button
                  size="sm"
                  {...userOutlineButtonProps}
                  onClick={() => void copyTransferContent()}
                >
                  {copied ? "Đã copy" : "Copy"}
                </Button>
              </HStack>
            </Stack>
          </Stack>
        </CardBody>
      </CardRoot>

      <HStack justify="center" gap={2}>
        <Spinner size="sm" color="cerulean.600" />
        <Text fontSize="sm" color="fg.muted">
          Đang chờ xác nhận cọc…
        </Text>
      </HStack>
    </Stack>
  );
}

export default function BookPaymentPage() {
  return (
    <Suspense
      fallback={
        <Text textAlign="center" py={8} color="fg.muted">
          Đang tải…
        </Text>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
