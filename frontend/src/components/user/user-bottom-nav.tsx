"use client";

import { Box, Button, HStack } from "@chakra-ui/react";
import { motion, useReducedMotion } from "framer-motion";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { useHomeChrome } from "@/components/user/home-chrome";
import { APP_COLOR_PALETTE, userStickyBarProps } from "@/lib/user-theme";

const easeOut = [0.22, 1, 0.36, 1] as const;

export function UserBottomNav() {
  const pathname = usePathname();
  const { revealed } = useHomeChrome();
  const reduceMotion = useReducedMotion();
  if (pathname !== "/home" || !revealed) {
    return null;
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { y: "100%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.75, ease: easeOut }}
      style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 10 }}
    >
    <Box
      px={3}
      py={2}
      pb="calc(8px + env(safe-area-inset-bottom))"
      {...userStickyBarProps}
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
    </motion.div>
  );
}
