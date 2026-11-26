"use client";

import { Box, Container } from "@chakra-ui/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usePathname } from "next/navigation";
import { useContext, useRef } from "react";

import { HomeChromeProvider } from "@/components/user/home-chrome";
import { MessengerFloatingButton } from "@/components/user/messenger-contact-button";
import { UserBottomNav } from "@/components/user/user-bottom-nav";
import { USER_COLOR_PALETTE, userPageBg } from "@/lib/user-theme";

const pageEase = [0.22, 1, 0.36, 1] as const;

const pageSlideVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? "48%" : "-48%",
  }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? "-48%" : "48%",
  }),
};

function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const frozen = useRef(context).current;
  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

function routeRank(pathname: string) {
  if (pathname === "/home") return 0;
  if (pathname === "/book") return 1;
  if (pathname.startsWith("/book/")) return 2;
  if (pathname.startsWith("/payment")) return 3;
  return 1;
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const showBottomNav = pathname === "/home";
  const containerPb = showBottomNav ? 20 : 6;
  const direction = useRef(1);
  const prevPath = useRef(pathname);
  if (prevPath.current !== pathname) {
    direction.current =
      routeRank(pathname) >= routeRank(prevPath.current) ? 1 : -1;
    prevPath.current = pathname;
  }

  return (
    <HomeChromeProvider>
      <Box
        minH="100dvh"
        bg={userPageBg}
        colorPalette={USER_COLOR_PALETTE}
      >
        <Container maxW="md" px={4} py={4} pb={containerPb}>
          <Box position="relative" overflow="hidden">
            <AnimatePresence initial={false} custom={direction.current} mode="popLayout">
              <motion.div
                key={pathname}
                custom={direction.current}
                variants={reduceMotion ? undefined : pageSlideVariants}
                initial={reduceMotion ? false : "enter"}
                animate="center"
                exit="exit"
                transition={{ duration: 0.6, ease: pageEase }}
                style={{ width: "100%" }}
              >
                <FrozenRouter>{children}</FrozenRouter>
              </motion.div>
            </AnimatePresence>
          </Box>
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
