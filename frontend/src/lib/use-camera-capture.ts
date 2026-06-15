"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

function hasVideoFrame(video: HTMLVideoElement): boolean {
  return video.videoWidth > 0 && video.videoHeight > 0;
}

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

export type UseCameraCaptureOptions = {
  onCapture: (file: File) => void | Promise<void>;
  fileNamePrefix?: string;
};

export function useCameraCapture({
  onCapture,
  fileNamePrefix = "capture",
}: UseCameraCaptureOptions) {
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

  const openRearCamera = useCallback(() => {
    if (uploading || cameraStarting) return false;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      fileInputRef.current?.click();
      return true;
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
      } catch {
        fileInputRef.current?.click();
      } finally {
        setCameraStarting(false);
      }
    })();
    return true;
  }, [uploading, cameraStarting]);

  const handleFileFromInput = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        await onCapture(file);
      } finally {
        setUploading(false);
      }
    },
    [onCapture],
  );

  const capturePhoto = useCallback(() => {
    void (async () => {
      const video = videoRef.current;
      if (!video || !streamRef.current) return;

      if (!hasVideoFrame(video)) {
        await bindStreamToVideo(video, streamRef.current);
        const ready = await waitForVideoFrame(video);
        if (!ready) return;
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
          if (!blob) return;
          closeCamera();
          const file = new File([blob], `${fileNamePrefix}-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          void handleFileFromInput(file);
        },
        "image/jpeg",
        0.92,
      );
    })();
  }, [closeCamera, fileNamePrefix, handleFileFromInput]);

  return {
    dialogOpen,
    setDialogOpen,
    cameraStarting,
    uploading,
    videoReady,
    fileInputRef,
    setVideoNode,
    syncVideoReady,
    closeCamera,
    openRearCamera,
    capturePhoto,
    handleFileFromInput,
    isBusy: uploading || cameraStarting,
  };
}
