"use client";

import { createIcon } from "@chakra-ui/react";

export const PencilIcon = createIcon({
  displayName: "PencilIcon",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
    />
  ),
});

export const TrashIcon = createIcon({
  displayName: "TrashIcon",
  path: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 6h18"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      />
    </>
  ),
});

export const PlusIcon = createIcon({
  displayName: "PlusIcon",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      d="M12 5v14M5 12h14"
    />
  ),
});

export const ChevronRightIcon = createIcon({
  displayName: "ChevronRightIcon",
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
