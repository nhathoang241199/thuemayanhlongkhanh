"use client";

import { Box, Button, HStack } from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { APP_COLOR_PALETTE, userStickyBarProps } from "@/lib/user-theme";

export function UserBottomNav() {
  const pathname = usePathname();
  if (pathname !== "/home") {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      px={3}
      py={2}
      pb="calc(8px + env(safe-area-inset-bottom))"
      {...userStickyBarProps}
      zIndex={10}
    >
      <HStack maxW="md" mx="auto" gap={2} justify="stretch">
        <Button
          asChild
          flex={1}
          size="sm"
          variant="solid"
          colorPalette={APP_COLOR_PALETTE}
          fontSize="xs"
        >
          <NextLink href="/book">Đặt lịch</NextLink>
        </Button>
      </HStack>
    </Box>
  );
}
