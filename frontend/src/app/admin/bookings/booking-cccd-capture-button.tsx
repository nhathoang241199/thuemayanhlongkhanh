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
import { useAdminMobileLayout } from "@/lib/use-admin-mobile-layout";
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

export function BookingCccdCaptureButton({
  customerId,
  customerName,
  disabled = false,
  size = "lg",
  onUploaded,
}: BookingCccdCaptureButtonProps) {
  const isMobileLayout = useAdminMobileLayout();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [streamVersion, setStreamVersion] = useState(0);

  const closeCamera = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setDialogOpen(false);
    setCameraStarting(false);
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [dialogOpen, streamVersion]);

  useEffect(() => () => stopMediaStream(streamRef.current), []);

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
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        streamRef.current = stream;
        setStreamVersion((v) => v + 1);
        setDialogOpen(true);
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
    const video = videoRef.current;
    if (!video || video.videoWidth < 1 || video.videoHeight < 1) {
      toaster.error({ title: "Camera chưa sẵn sàng", description: "Thử lại." });
      return;
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
  };

  if (!isMobileLayout) {
    return null;
  }

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
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  {cameraStarting ? (
                    <Text
                      position="absolute"
                      inset={0}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="white"
                      fontSize="sm"
                      bg="blackAlpha.700"
                    >
                      Đang mở camera…
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
                disabled={cameraStarting}
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
