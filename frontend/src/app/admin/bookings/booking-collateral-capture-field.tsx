"use client";

import { Button, Image, Stack, Text } from "@chakra-ui/react";

import { isVerificationImageFile } from "@/lib/customer-verification-upload";
import { useCameraCapture } from "@/lib/use-camera-capture";
import { toaster } from "@/lib/toaster";

import { CameraCaptureDialog } from "./camera-capture-dialog";

type BookingCollateralCaptureFieldProps = {
  bookingId: string;
  imageUrl: string | null;
  disabled?: boolean;
  onUploaded: (url: string) => void;
};

export function BookingCollateralCaptureField({
  bookingId,
  imageUrl,
  disabled = false,
  onUploaded,
}: BookingCollateralCaptureFieldProps) {
  const handleCapture = async (file: File) => {
    if (!isVerificationImageFile(file)) {
      toaster.error({
        title: "Định dạng không hỗ trợ",
        description: "Chỉ JPG, PNG hoặc WebP.",
      });
      return;
    }
    const { uploadBookingCollateralImage } = await import(
      "@/lib/booking-collateral-upload"
    );
    const url = await uploadBookingCollateralImage(bookingId, file);
    toaster.success({ title: "Đã lưu ảnh vật thế chân" });
    onUploaded(url);
  };

  const camera = useCameraCapture({
    fileNamePrefix: "collateral",
    onCapture: handleCapture,
  });

  return (
    <Stack gap={2}>
      <Text fontSize="sm" fontWeight="medium">
        Ảnh vật thế chân
      </Text>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="Vật thế chân"
          maxH="160px"
          borderRadius="md"
          objectFit="contain"
          bg="gray.50"
        />
      ) : (
        <Text fontSize="xs" color="fg.muted">
          Chưa chụp ảnh vật thế chân cho đơn này.
        </Text>
      )}
      <Button
        type="button"
        size="sm"
        colorPalette="orange"
        variant="solid"
        disabled={disabled || camera.isBusy}
        loading={camera.isBusy}
        onClick={() => {
          if (disabled || camera.isBusy) return;
          camera.openRearCamera();
        }}
      >
        {imageUrl ? "Chụp lại vật thế chân" : "Chụp vật thế chân"}
      </Button>
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
        title="Chụp vật thế chân"
        hint="Chụp tiền mặt hoặc đồ vật thế chân — lưu theo từng đơn"
        captureLabel="Chụp & lưu"
        colorPalette="orange"
        uploading={camera.uploading}
        videoReady={camera.videoReady}
        cameraStarting={camera.cameraStarting}
        setVideoNode={camera.setVideoNode}
        syncVideoReady={camera.syncVideoReady}
        onClose={camera.closeCamera}
        onCapture={camera.capturePhoto}
      />
    </Stack>
  );
}
