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
import { useEffect, useState } from "react";

import {
  ADMIN_COLOR_PALETTE,
  cardSurfaceProps,
} from "@/lib/app-theme";

const PANEL_TRANSITION_MS = 280;
const BACKDROP_TRANSITION_MS = 250;

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
        variant="solid"
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
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(false);
      return;
    }
    setVisible(false);
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return;
    const id = window.setTimeout(() => setVisible(true), 20);
    return () => window.clearTimeout(id);
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted || !visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, visible, onOpenChange]);

  const close = () => onOpenChange(false);

  const handlePanelTransitionEnd = () => {
    if (!visible && !open) setMounted(false);
  };

  if (!mounted) return null;

  return (
    <Box position="fixed" inset={0} zIndex={1400}>
      <Box
        position="absolute"
        inset={0}
        bg="blackAlpha.600"
        opacity={visible ? 1 : 0}
        pointerEvents={visible ? "auto" : "none"}
        transition={`opacity ${BACKDROP_TRANSITION_MS}ms ease`}
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
        transform={visible ? "translateX(0)" : "translateX(-100%)"}
        transition={`transform ${PANEL_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`}
        willChange="transform"
        onTransitionEnd={handlePanelTransitionEnd}
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
              variant={navVariant(pathname === "/admin/ship-orders")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/ship-orders">Đơn giao</NextLink>
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
            <Button
              asChild
              variant={navVariant(pathname === "/admin/lenses")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/lenses">Ống kính</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/closures")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/closures">Ngày nghỉ</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/info")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/info">Thông tin</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/shippers")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/shippers">Shipper</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/features")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/features">Chức năng</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/terms")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/terms">Điều khoản</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/messenger-learn")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/messenger-learn">Học Messenger</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/fanpage-posts")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/fanpage-posts">Bài fanpage</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/blog-posts")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
              justifyContent="flex-start"
              onClick={close}
            >
              <NextLink href="/admin/blog-posts">Blog</NextLink>
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
      <Box {...cardSurfaceProps} borderRadius="md" p={3}>
        <HStack justify="space-between" align="center" gap={3} w="full">
          <HStack gap={1.5} flexWrap="wrap" flex="1" minW={0}>
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
              variant={navVariant(pathname === "/admin/ship-orders")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/ship-orders">Đơn giao</NextLink>
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
            <Button
              asChild
              variant={navVariant(pathname === "/admin/lenses")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/lenses">Ống kính</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/closures")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/closures">Ngày nghỉ</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/info")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/info">Thông tin</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/shippers")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/shippers">Shipper</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/features")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/features">Chức năng</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/terms")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/terms">Điều khoản</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/messenger-learn")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/messenger-learn">Học Messenger</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/fanpage-posts")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/fanpage-posts">Bài fanpage</NextLink>
            </Button>
            <Button
              asChild
              variant={navVariant(pathname === "/admin/blog-posts")}
              colorPalette={ADMIN_COLOR_PALETTE}
              size="sm"
            >
              <NextLink href="/admin/blog-posts">Blog</NextLink>
            </Button>
          </HStack>
          <Button
            type="button"
            variant="outline"
            colorPalette={ADMIN_COLOR_PALETTE}
            size="sm"
            flexShrink={0}
            onClick={onLogout}
          >
            Đăng xuất
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}
