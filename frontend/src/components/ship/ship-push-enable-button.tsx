"use client";

import { Button, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";

import { enableShipperWebPush } from "@/lib/shipper-auth";
import { mutedAccentColor, titleColor } from "@/lib/user-theme";

type PushState = "idle" | "on" | "unsupported" | "denied" | "loading";

export function ShipPushEnableButton() {
  const [state, setState] = useState<PushState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager.getSubscription();
        if (Notification.permission === "granted" && sub) {
          setState("on");
        }
      } catch {
        /* keep idle */
      }
    })();
  }, []);

  const enable = useCallback(async () => {
    setError(null);
    setState("loading");
    try {
      const result = await enableShipperWebPush();
      if (result === "granted") setState("on");
      else if (result === "denied") setState("denied");
      else setState("unsupported");
    } catch (e) {
      setState("idle");
      setError(e instanceof Error ? e.message : "Không bật được thông báo");
    }
  }, []);

  if (state === "unsupported") {
    return (
      <Text fontSize="xs" color={mutedAccentColor}>
        Trình duyệt không hỗ trợ thông báo đẩy.
      </Text>
    );
  }

  if (state === "on") {
    return (
      <Text fontSize="xs" color={titleColor} fontWeight="medium">
        Đã bật thông báo đơn mới
      </Text>
    );
  }

  if (state === "denied") {
    return (
      <Text fontSize="xs" color="red.fg">
        Thông báo bị chặn — mở lại trong cài đặt trình duyệt.
      </Text>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        colorPalette="blue"
        loading={state === "loading"}
        onClick={() => void enable()}
      >
        Bật thông báo đơn mới
      </Button>
      {error ? (
        <Text fontSize="xs" color="red.fg" mt={1}>
          {error}
        </Text>
      ) : null}
    </>
  );
}
