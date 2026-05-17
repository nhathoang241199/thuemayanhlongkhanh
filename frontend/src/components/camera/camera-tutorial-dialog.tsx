"use client";

import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

import { YoutubeEmbed } from "@/components/camera/youtube-embed";
import {
  fetchPublicCamera,
  type PublicCameraDetail,
} from "@/lib/booking-api";
import { titleColor } from "@/lib/user-theme";

type CameraTutorialDialogProps = {
  cameraId: string | null;
  cameraName?: string;
  onClose: () => void;
};

export function CameraTutorialDialog({
  cameraId,
  cameraName,
  onClose,
}: CameraTutorialDialogProps) {
  const [camera, setCamera] = useState<PublicCameraDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cameraId) {
      setCamera(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCamera(null);

    void fetchPublicCamera(cameraId)
      .then((data) => {
        if (!cancelled) setCamera(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không tải được video.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cameraId]);

  const open = Boolean(cameraId);
  const displayName = camera?.name ?? cameraName ?? "máy ảnh";

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
      size="lg"
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent mx={3}>
          <DialogHeader>
            <DialogTitle color={titleColor}>
              Hướng dẫn {displayName}
            </DialogTitle>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody pb={6}>
            <Stack gap={3}>
              {loading ? (
                <Stack align="center" py={8} gap={2}>
                  <Spinner color="cerulean.600" />
                  <Text fontSize="sm" color="fg.muted">
                    Đang tải video…
                  </Text>
                </Stack>
              ) : null}
              {error ? (
                <Text fontSize="sm" color="red.fg">
                  {error}
                </Text>
              ) : null}
              {!loading && !error && camera ? (
                camera.tutorialVideoUrl ? (
                  <YoutubeEmbed
                    url={camera.tutorialVideoUrl}
                    title={`Hướng dẫn ${camera.name}`}
                  />
                ) : (
                  <Text fontSize="sm" color="fg.muted">
                    Chưa có video hướng dẫn. Liên hệ cửa hàng khi nhận máy.
                  </Text>
                )
              ) : null}
            </Stack>
          </DialogBody>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
