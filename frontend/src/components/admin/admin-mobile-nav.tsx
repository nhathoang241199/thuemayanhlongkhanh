"use client";

import {
  Box,
  Button,
  createIcon,
  HStack,
  IconButton,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useEffect } from "react";

import {
  ADMIN_COLOR_PALETTE,
  cardSurfaceProps,
} from "@/lib/app-theme";

const MenuIcon = createIcon({
  displayName: "AdminMenuIcon",
  path: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M4 7h16M4 12h16M4 17h16"
      />
    </>
  ),
});

const CloseIcon = createIcon({
  displayName: "AdminCloseIcon",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      d="M6 6l12 12M18 6L6 18"
    />
  ),
});

type AdminMobileNavProps = {
  pathname: string;
  pageTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
};

function navVariant(active: boolean): "solid" | "ghost" {
  return active ? "solid" : "ghost";
}

export function AdminMobileNavBar({
  pageTitle,
  onOpenMenu,
}: {
  pageTitle: string;
  onOpenMenu: () => void;
}) {
  return (
    <HStack
      display={{ base: "flex", lg: "none" }}
      gap={3}
      align="center"
      w="full"
    >
      <IconButton
        type="button"
        size="sm"
        variant="outline"
        colorPalette={ADMIN_COLOR_PALETTE}
        aria-label="Mở menu điều hướng"
        onClick={onOpenMenu}
      >
        <MenuIcon />
      </IconButton>
      <Text fontWeight="semibold" fontSize="lg" flex="1" minW={0} truncate>
        {pageTitle}
      </Text>
    </HStack>
  );
}

export function AdminMobileNavDrawer({
  pathname,
  open,
  onOpenChange,
  onLogout,
}: Omit<AdminMobileNavProps, "pageTitle">) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const close = () => onOpenChange(false);

  return (
    <Box position="fixed" inset={0} zIndex={1400}>
      <Box
        position="absolute"
        inset={0}
        bg="blackAlpha.600"
        onClick={close}
        aria-hidden
      />
      <Box
        position="absolute"
        top={0}
        left={0}
        bottom={0}
        w="min(85vw, 18rem)"
        bg="white"
        shadow="lg"
        borderRightWidth="1px"
        borderColor="ocean.200"
        p={4}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap={4} h="full">
          <HStack justify="space-between" align="center">
            <Text fontWeight="semibold" fontSize="md">
              Menu
            </Text>
            <IconButton
              type="button"
              size="sm"
              variant="ghost"
              colorPalette={ADMIN_COLOR_PALETTE}
              aria-label="Đóng menu"
              onClick={close}
            >
              <CloseIcon />
            </IconButton>
          </HStack>
          <Stack gap={1.5} flex="1">
            <Button
              asChild
              variant={navVariant(pathname === "/admin")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin">Tổng quan</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/bookings")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/bookings">Đơn thuê</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/expenses")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/expenses">Chi tiêu</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(
                pathname === "/admin/customers" ||
                  pathname.startsWith("/admin/customers/"),
              )}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/customers">Khách hàng</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/cameras")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/cameras">Máy ảnh</NextLink>
            </Button>
          </Stack>
          <Button
            type="button"
            variant="outline"
            colorPalette={ADMIN_COLOR_PALETTE}
            size="sm"
            w="full"
            onClick={() => {
              close();
              onLogout();
            }}
          >
            Đăng xuất
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

export function AdminDesktopNav({
  pathname,
  onLogout,
}: {
  pathname: string;
  onLogout: () => void;
}) {
  return (
    <Box display={{ base: "none", lg: "block" }}>
      <Box {...cardSurfaceProps} borderRadius="md">
        <Stack gap={2} p={3}>
          <HStack gap={1.5} flexWrap="wrap" w="full">
            <Button
              asChild
              variant={navVariant(pathname === "/admin")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin">Tổng quan</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/bookings")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/bookings">Đơn thuê</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/expenses")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/expenses">Chi tiêu</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(
                pathname === "/admin/customers" ||
                  pathname.startsWith("/admin/customers/"),
              )}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/customers">Khách hàng</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/cameras")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/cameras">Máy ảnh</NextLink>
            </Button>
          </HStack>
          <Button
            type="button"
            variant="outline"
            colorPalette={ADMIN_COLOR_PALETTE}
            size="sm"
            alignSelf="flex-end"
            onClick={onLogout}
          >
            Đăng xuất
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
