"use client";

import { IconButton } from "@chakra-ui/react";
import { useCallback } from "react";

import { CameraCaptureDialog } from "@/app/admin/bookings/camera-capture-dialog";
import { ShipCameraIcon } from "@/components/ship/chevron-icons";
import { isVerificationImageFile } from "@/lib/customer-verification-upload";
import { uploadShipOrderCustomerVerification } from "@/lib/shipper-auth";
import { toaster } from "@/lib/toaster";
import { useCameraCapture } from "@/lib/use-camera-capture";
import { USER_COLOR_PALETTE } from "@/lib/user-theme";

type ShipCccdCaptureButtonProps = {
  orderId: string;
  customerName: string;
  disabled?: boolean;
  onUploaded?: () => void;
};

export function ShipCccdCaptureButton({
  orderId,
  customerName,
  disabled = false,
  onUploaded,
}: ShipCccdCaptureButtonProps) {
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
        await uploadShipOrderCustomerVerification(orderId, file);
        toaster.success({
          title: "Đã lưu ảnh CCCD",
          description: customerName,
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
    [customerName, onUploaded, orderId],
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
          "Cho phép quyền Camera trong trình duyệt (Cài đặt → Safari → Camera).",
      });
    }
  };

  return (
    <>
      <IconButton
        type="button"
        size="lg"
        variant="subtle"
        colorPalette="blue"
        flexShrink={0}
        aria-label={`Chụp CCCD — ${customerName}`}
        disabled={disabled || camera.isBusy}
        loading={camera.isBusy}
        onClick={openRearCamera}
      >
        <ShipCameraIcon boxSize="1.35rem" />
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
        hint="Camera sau · lưu vào hồ sơ khách"
        captureLabel="Chụp & lưu"
        colorPalette={USER_COLOR_PALETTE}
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
