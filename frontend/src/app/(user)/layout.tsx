"use client";

import { Box, Container } from "@chakra-ui/react";

import { UserBottomNav } from "@/components/user/user-bottom-nav";
import { USER_COLOR_PALETTE, userPageBg } from "@/lib/user-theme";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      minH="100dvh"
      bg={userPageBg}
      colorPalette={USER_COLOR_PALETTE}
    >
      <Container maxW="md" px={4} py={4} pb={20}>
        {children}
      </Container>
      <UserBottomNav />
    </Box>
  );
}
