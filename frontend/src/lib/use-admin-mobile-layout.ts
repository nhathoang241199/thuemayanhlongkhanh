"use client";

import { useSyncExternalStore } from "react";

/** Khớp `AdminResponsiveTable` breakpoint `md` — layout card mobile admin. */
export const ADMIN_MOBILE_LAYOUT_MQ = "(max-width: 47.9375em)";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(ADMIN_MOBILE_LAYOUT_MQ);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(ADMIN_MOBILE_LAYOUT_MQ).matches;
}

function getServerSnapshot() {
  return false;
}

export function useAdminMobileLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
