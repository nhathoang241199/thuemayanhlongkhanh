"use client";

import { Box, Button, HStack, createIcon } from "@chakra-ui/react";
import NextLink from "next/link";
import { APP_COLOR_PALETTE, userStickyBarProps } from "@/lib/user-theme";

const HomeIcon = createIcon({
  displayName: "HomeIcon",
  viewBox: "0 0 24 24",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"
    />
  ),
});

const NAV_ITEMS = [
  {
    href: "/home",
    label: "Trang chủ",
    iconOnly: true as const,
    variant: "outline" as const,
  },
  { href: "/book", label: "Đặt lịch", variant: "solid" as const },
] as const;

export function UserBottomNav() {
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
        {NAV_ITEMS.map((item) => {
          const iconOnly = "iconOnly" in item && item.iconOnly;
          return (
            <Button
              key={item.href}
              asChild
              flex={iconOnly ? "0 0 auto" : 1}
              size="sm"
              variant={item.variant}
              colorPalette={APP_COLOR_PALETTE}
              fontSize="xs"
              px={iconOnly ? 0 : 2}
              minW={iconOnly ? "2.5rem" : undefined}
              w={iconOnly ? "2.5rem" : undefined}
              h={iconOnly ? "2.5rem" : undefined}
              aria-label={item.label}
            >
              <NextLink href={item.href}>
                {iconOnly ? (
                  <HomeIcon boxSize="1.25em" aria-hidden />
                ) : (
                  item.label
                )}
              </NextLink>
            </Button>
          );
        })}
      </HStack>
    </Box>
  );
}
