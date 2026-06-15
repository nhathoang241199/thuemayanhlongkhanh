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
  Stack,
  Text,
} from "@chakra-ui/react";

import { APP_COLOR_PALETTE } from "@/lib/app-theme";

type CameraCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  hint: string;
  captureLabel: string;
  colorPalette?: string;
  uploading?: boolean;
  videoReady: boolean;
  cameraStarting: boolean;
  setVideoNode: (node: HTMLVideoElement | null) => void;
  syncVideoReady: () => void;
  onClose: () => void;
  onCapture: () => void;
};

export function CameraCaptureDialog({
  open,
  onOpenChange,
  title,
  hint,
  captureLabel,
  colorPalette = APP_COLOR_PALETTE,
  uploading = false,
  videoReady,
  cameraStarting,
  setVideoNode,
  syncVideoReady,
  onClose,
  onCapture,
}: CameraCaptureDialogProps) {
  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      lazyMount
      unmountOnExit
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent maxW="md" mx={3} w="full">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
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
                {hint}
              </Text>
            </Stack>
          </DialogBody>
          <DialogFooter gap={2}>
            <Button
              type="button"
              variant="outline"
              flex={1}
              onClick={onClose}
              disabled={uploading}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              colorPalette={colorPalette}
              flex={1}
              loading={uploading}
              disabled={cameraStarting || !videoReady}
              onClick={onCapture}
            >
              {captureLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
