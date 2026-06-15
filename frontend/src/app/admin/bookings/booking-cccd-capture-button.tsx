"use client";

import { IconButton } from "@chakra-ui/react";
import { useCallback } from "react";

import {
  isVerificationImageFile,
  uploadCustomerVerificationImage,
} from "@/lib/customer-verification-upload";
import { useCameraCapture } from "@/lib/use-camera-capture";
import { toaster } from "@/lib/toaster";

import { CameraCaptureDialog } from "./camera-capture-dialog";
import { CameraIcon } from "./booking-list-icons";

type BookingCccdCaptureButtonProps = {
  customerId: string;
  customerName: string;
  disabled?: boolean;
  size?: "sm" | "lg";
  onUploaded?: () => void;
};

export function BookingCccdCaptureButton({
  customerId,
  customerName,
  disabled = false,
  size = "lg",
  onUploaded,
}: BookingCccdCaptureButtonProps) {
  const uploadOneFile = useCallback(
    async (file: File) => {
      if (!isVerificationImageFile(file)) {
        toaster.error({
          title: "Định dạng không hỗ trợ",
          description: "Chỉ JPG, PNG hoặc WebP.",
        });
        return;
      }
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
        throw e;
      }
    },
    [customerId, customerName, onUploaded],
  );

  const camera = useCameraCapture({
    fileNamePrefix: "cccd",
    onCapture: uploadOneFile,
  });

  const openRearCamera = () => {
    if (disabled || camera.isBusy) return;
    const opened = camera.openRearCamera();
    if (!opened) {
      toaster.error({
        title: "Không mở được camera sau",
        description:
          "Cho phép quyền Camera trong Safari (Cài đặt → Safari → Camera).",
      });
    }
  };

  return (
    <>
      <IconButton
        type="button"
        size={size}
        variant="subtle"
        colorPalette="blue"
        aria-label={`Chụp CCCD — ${customerName}`}
        disabled={disabled || camera.isBusy}
        loading={camera.isBusy}
        onClick={openRearCamera}
      >
        <CameraIcon boxSize={size === "lg" ? "1.35rem" : undefined} />
      </IconButton>

      <input
        ref={camera.fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void camera.handleFileFromInput(file);
        }}
      />

      <CameraCaptureDialog
        open={camera.dialogOpen}
        onOpenChange={(open) => {
          if (!open) camera.closeCamera();
        }}
        title={`Chụp CCCD — ${customerName}`}
        hint="Camera sau · mỗi lần chụp lưu 1 ảnh vào hồ sơ khách"
        captureLabel="Chụp & lưu"
        colorPalette="blue"
        uploading={camera.uploading}
        videoReady={camera.videoReady}
        cameraStarting={camera.cameraStarting}
        setVideoNode={camera.setVideoNode}
        syncVideoReady={camera.syncVideoReady}
        onClose={camera.closeCamera}
        onCapture={camera.capturePhoto}
      />
    </>
  );
}
