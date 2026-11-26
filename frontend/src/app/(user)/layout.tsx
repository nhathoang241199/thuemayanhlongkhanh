"use client";

import { Box, Container } from "@chakra-ui/react";
import { LayoutGroup } from "framer-motion";
import { usePathname } from "next/navigation";

import { HomeChromeProvider } from "@/components/user/home-chrome";
import { MessengerFloatingButton } from "@/components/user/messenger-contact-button";
import { UserBottomNav } from "@/components/user/user-bottom-nav";
import { USER_COLOR_PALETTE, userPageBg } from "@/lib/user-theme";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showBottomNav = pathname === "/home";
  const containerPb = showBottomNav ? 20 : 6;

  return (
    <HomeChromeProvider>
      <Box
        minH="100dvh"
        bg={userPageBg}
        colorPalette={USER_COLOR_PALETTE}
      >
        <Container maxW="md" px={4} py={4} pb={containerPb}>
          <LayoutGroup id="home-hello">{children}</LayoutGroup>
        </Container>
        <UserBottomNav />
        <MessengerFloatingButton
          bottom={showBottomNav ? "5.5rem" : "1rem"}
          waitForHomeIntro={showBottomNav}
        />
      </Box>
    </HomeChromeProvider>
  );
}
