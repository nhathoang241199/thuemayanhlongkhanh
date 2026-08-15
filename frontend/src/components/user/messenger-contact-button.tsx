"use client";

import { Box, IconButton, Link, createIcon } from "@chakra-ui/react";
import { useState, type MouseEvent } from "react";

import { getMessengerUrl } from "@/lib/site-config";
import { APP_COLOR_PALETTE } from "@/lib/user-theme";

const MessengerIcon = createIcon({
  displayName: "MessengerIcon",
  viewBox: "0 0 36 36",
  path: (
    <path
      fill="currentColor"
      d="M18 2C9.716 2 3 8.045 3 15.418c0 4.348 2.167 8.22 5.563 10.745L6.5 34l7.318-2.562C15.214 31.801 16.578 32 18 32c8.284 0 15-6.045 15-13.418S26.284 2 18 2zm1.616 17.848-3.924-4.185-7.676 4.185 6.485-6.885 3.924 4.185 7.676-4.185-6.485 6.885z"
    />
  ),
});

const CloseIcon = createIcon({
  displayName: "MessengerFabCloseIcon",
  viewBox: "0 0 24 24",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      d="M6 6l12 12M18 6L6 18"
    />
  ),
});

type MessengerFloatingButtonProps = {
  /** Khoảng cách từ đáy màn hình — tránh đè lên bottom nav. */
  bottom?: string;
};

export function MessengerFloatingButton({
  bottom = "1rem",
}: MessengerFloatingButtonProps) {
  const href = getMessengerUrl();
  const [dismissed, setDismissed] = useState(false);

  if (!href || dismissed) {
    return null;
  }

  const dismiss = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDismissed(true);
  };

  return (
    <Box
      position="fixed"
      right={4}
      bottom={`calc(${bottom} + env(safe-area-inset-bottom))`}
      zIndex={20}
    >
      <Box position="relative" w="56px" h="56px">
        <IconButton
          aria-label="Ẩn nút Messenger"
          position="absolute"
          top="-6px"
          right="-6px"
          size="2xs"
          w="22px"
          h="22px"
          minW="22px"
          borderRadius="full"
          bg="gray.700"
          color="white"
          zIndex={1}
          onClick={dismiss}
        >
          <CloseIcon boxSize={2.5} />
        </IconButton>
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="56px"
          h="56px"
          borderRadius="full"
          colorPalette={APP_COLOR_PALETTE}
          bg="colorPalette.solid"
          color="colorPalette.contrast"
          boxShadow="md"
          transition="transform 0.15s ease"
          _hover={{ bg: "colorPalette.solid/90", transform: "scale(1.06)" }}
          _active={{ transform: "scale(0.98)" }}
        >
          <MessengerIcon boxSize={8} />
        </Link>
      </Box>
    </Box>
  );
}
