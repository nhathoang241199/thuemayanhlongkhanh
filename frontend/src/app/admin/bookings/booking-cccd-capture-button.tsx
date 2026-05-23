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
  IconButton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  isVerificationImageFile,
  uploadCustomerVerificationImage,
} from "@/lib/customer-verification-upload";
import { APP_COLOR_PALETTE } from "@/lib/app-theme";
import { toaster } from "@/lib/toaster";

import { CameraIcon } from "./booking-list-icons";

type BookingCccdCaptureButtonProps = {
  customerId: string;
  customerName: string;
  disabled?: boolean;
  size?: "sm" | "lg";
  onUploaded?: () => void;
};

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

function hasVideoFrame(video: HTMLVideoElement): boolean {
  return video.videoWidth > 0 && video.videoHeight > 0;
}

/** iOS Safari: videoWidth/Height chỉ có sau loadedmetadata / playing. */
function waitForVideoFrame(
  video: HTMLVideoElement,
  timeoutMs = 8000,
): Promise<boolean> {
  if (hasVideoFrame(video)) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(hasVideoFrame(video));
    };

    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", finish);
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("playing", finish);
      video.removeEventListener("resize", finish);
    };

    video.addEventListener("loadedmetadata", finish);
    video.addEventListener("loadeddata", finish);
    video.addEventListener("playing", finish);
    video.addEventListener("resize", finish);

    const timer = window.setTimeout(finish, timeoutMs);
  });
}

async function bindStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  video.muted = true;
  try {
    await video.play();
  } catch {
    /* Safari có thể chặn play() cho đến khi user tương tác thêm */
  }
}

export function BookingCccdCaptureButton({
  customerId,
  customerName,
  disabled = false,
  size = "lg",
  onUploaded,
}: BookingCccdCaptureButtonProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [streamVersion, setStreamVersion] = useState(0);

  const closeCamera = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setDialogOpen(false);
    setCameraStarting(false);
    setVideoReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const syncVideoReady = useCallback(() => {
    const video = videoRef.current;
    setVideoReady(!!video && hasVideoFrame(video));
  }, []);

  const attachStreamWhenPossible = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream || !dialogOpen) return;

    const video = videoRef.current;
    if (!video) return;

    await bindStreamToVideo(video, stream);
    const ready = await waitForVideoFrame(video);
    setVideoReady(ready);
  }, [dialogOpen]);

  useEffect(() => {
    if (!dialogOpen || !streamRef.current) {
      setVideoReady(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60;

    const tryAttach = () => {
      if (cancelled) return;
      attempts += 1;
      const video = videoRef.current;
      const stream = streamRef.current;
      if (video && stream) {
        void (async () => {
          await bindStreamToVideo(video, stream);
          if (cancelled) return;
          const ready = await waitForVideoFrame(video);
          if (!cancelled) setVideoReady(ready);
        })();
        return;
      }
      if (attempts < maxAttempts) {
        requestAnimationFrame(tryAttach);
      }
    };

    tryAttach();
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, streamVersion]);

  useEffect(() => () => stopMediaStream(streamRef.current), []);

  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && streamRef.current && dialogOpen) {
        void attachStreamWhenPossible();
      }
    },
    [dialogOpen, attachStreamWhenPossible],
  );

  const uploadOneFile = useCallback(
    async (file: File) => {
      if (!isVerificationImageFile(file)) {
        toaster.error({
          title: "Định dạng không hỗ trợ",
          description: "Chỉ JPG, PNG hoặc WebP.",
        });
        return;
      }
      setUploading(true);
      try {
        const urls = await uploadCustomerVerificationImage(customerId, file);
        toaster.success({
          title: "Đã lưu ảnh CCCD",
          description: `${customerName} — ${urls.length} ảnh trên hồ sơ.`,
        });
        onUploaded?.();
      } catch (e) {
        toaster.error({
          title: "Không lưu được ảnh CCCD",
          description: e instanceof Error ? e.message : "Lỗi upload",
        });
      } finally {
        setUploading(false);
      }
    },
    [customerId, customerName, onUploaded],
  );

  const openRearCamera = () => {
    if (disabled || uploading || cameraStarting) return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      fileInputRef.current?.click();
      return;
    }

    void (async () => {
      setCameraStarting(true);
      setVideoReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        streamRef.current = stream;
        setDialogOpen(true);
        setStreamVersion((v) => v + 1);
      } catch (e) {
        toaster.error({
          title: "Không mở được camera sau",
          description:
            e instanceof Error
              ? e.message
              : "Cho phép quyền Camera trong Safari (Cài đặt → Safari → Camera).",
        });
      } finally {
        setCameraStarting(false);
      }
    })();
  };

  const capturePhoto = () => {
    void (async () => {
      const video = videoRef.current;
      if (!video || !streamRef.current) {
        toaster.error({
          title: "Camera chưa sẵn sàng",
          description: "Đợi hình preview hiện rồi thử lại.",
        });
        return;
      }

      if (!hasVideoFrame(video)) {
        await bindStreamToVideo(video, streamRef.current);
        const ready = await waitForVideoFrame(video);
        if (!ready) {
          toaster.error({
            title: "Camera chưa sẵn sàng",
            description:
              "Chưa nhận được hình từ camera. Thử đóng và mở lại, hoặc dùng chụp ảnh hệ thống.",
          });
          return;
        }
        setVideoReady(true);
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            toaster.error({ title: "Không chụp được ảnh" });
            return;
          }
          closeCamera();
          const file = new File([blob], `cccd-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          void uploadOneFile(file);
        },
        "image/jpeg",
        0.92,
      );
    })();
  };

  return (
    <>
      <IconButton
        type="button"
        size={size}
        variant="subtle"
        colorPalette="blue"
        aria-label={`Chụp CCCD — ${customerName}`}
        disabled={disabled || uploading || cameraStarting}
        loading={uploading || cameraStarting}
        onClick={openRearCamera}
      >
        <CameraIcon boxSize={size === "lg" ? "1.35rem" : undefined} />
      </IconButton>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void uploadOneFile(file);
        }}
      />

      <DialogRoot
        open={dialogOpen}
        onOpenChange={(e) => {
          if (!e.open) closeCamera();
        }}
        lazyMount
        unmountOnExit
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="md" mx={3} w="full">
            <DialogHeader>
              <DialogTitle>Chụp CCCD — {customerName}</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody pb={2}>
              <Stack gap={3}>
                <Box
                  position="relative"
                  w="full"
                  aspectRatio="4/3"
                  bg="black"
                  borderRadius="md"
                  overflow="hidden"
                >
                  <video
                    ref={setVideoNode}
                    playsInline
                    muted
                    autoPlay
                    onLoadedMetadata={syncVideoReady}
                    onLoadedData={syncVideoReady}
                    onPlaying={syncVideoReady}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  {!videoReady ? (
                    <Text
                      position="absolute"
                      inset={0}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="white"
                      fontSize="sm"
                      bg="blackAlpha.700"
                      textAlign="center"
                      px={3}
                    >
                      {cameraStarting ? "Đang mở camera…" : "Đang khởi động camera…"}
                    </Text>
                  ) : null}
                </Box>
                <Text fontSize="xs" color="fg.muted" textAlign="center">
                  Camera sau · mỗi lần chụp lưu 1 ảnh vào hồ sơ khách
                </Text>
              </Stack>
            </DialogBody>
            <DialogFooter gap={2}>
              <Button
                type="button"
                variant="outline"
                flex={1}
                onClick={closeCamera}
                disabled={uploading}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                colorPalette={APP_COLOR_PALETTE}
                flex={1}
                loading={uploading}
                disabled={cameraStarting || !videoReady}
                onClick={capturePhoto}
              >
                Chụp & lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </>
  );
}
