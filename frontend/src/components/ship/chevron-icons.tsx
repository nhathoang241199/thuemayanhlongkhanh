"use client";

import { createIcon } from "@chakra-ui/react";

export const ShipChevronLeftIcon = createIcon({
  displayName: "ShipChevronLeftIcon",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 18l-6-6 6-6"
    />
  ),
});

export const ShipChevronRightIcon = createIcon({
  displayName: "ShipChevronRightIcon",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 18l6-6-6-6"
    />
  ),
});

export const ShipBellIcon = createIcon({
  displayName: "ShipBellIcon",
  path: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
      />
    </>
  ),
});

export const ShipCameraIcon = createIcon({
  displayName: "ShipCameraIcon",
  path: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
      />
      <circle
        cx="12"
        cy="13"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </>
  ),
});
