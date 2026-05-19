"use client";

import {
  Box,
  BreadcrumbCurrentLink,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbRoot,
  BreadcrumbSeparator,
  Button,
  CardBody,
  CardRoot,
  Container,
  HStack,
  Stack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment } from "react";

import { adminLogout } from "@/lib/admin-auth";
import {
  ADMIN_COLOR_PALETTE,
  adminShellBg,
  cardSurfaceProps,
} from "@/lib/app-theme";

type Crumb = { href: string | null; label: string };

function adminBreadcrumbs(pathname: string): Crumb[] {
  const home: Crumb = { href: "/", label: "Trang chủ" };
  if (pathname === "/admin") {
    return [home, { href: null, label: "Tổng quan" }];
  }
  const admin: Crumb = { href: "/admin", label: "Admin" };
  if (pathname === "/admin/cameras") {
    return [home, admin, { href: null, label: "Máy ảnh" }];
  }
  if (pathname === "/admin/customers") {
    return [home, admin, { href: null, label: "Khách hàng" }];
  }
  if (pathname === "/admin/bookings") {
    return [home, admin, { href: null, label: "Đơn thuê" }];
  }
  if (pathname === "/admin/expenses") {
    return [home, admin, { href: null, label: "Chi tiêu" }];
  }
  if (
    pathname.startsWith("/admin/customers/") &&
    pathname !== "/admin/customers"
  ) {
    return [
      home,
      admin,
      { href: "/admin/customers", label: "Khách hàng" },
      { href: null, label: "Chi tiết" },
    ];
  }
  return [home, admin, { href: null, label: "Admin" }];
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return <>{children}</>;
  }

  const crumbs = adminBreadcrumbs(pathname);

  const handleLogout = () => {
    void (async () => {
      await adminLogout();
      router.replace("/admin/login");
      router.refresh();
    })();
  };

  return (
    <Box
      minH="100dvh"
      bg={adminShellBg}
      colorPalette={ADMIN_COLOR_PALETTE}
      py={{ base: 8, md: 10 }}
    >
      <Container
        maxW={
          pathname === "/admin/bookings" ? "container.2xl" : "container.lg"
        }
        px={{ base: 3, md: 4 }}
      >
        <Stack gap={6}>
          <BreadcrumbRoot size="sm" colorPalette={ADMIN_COLOR_PALETTE}>
            <BreadcrumbList flexWrap="wrap">
              {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <Fragment key={`${c.href ?? c.label}-${i}`}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbCurrentLink fontWeight="semibold">
                          {c.label}
                        </BreadcrumbCurrentLink>
                      ) : (
                        <BreadcrumbLink asChild>
                          <NextLink href={c.href!}>{c.label}</NextLink>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </BreadcrumbRoot>
          <CardRoot {...cardSurfaceProps}>
            <CardBody py={3}>
              <Stack gap={2}>
                <HStack gap={1.5} flexWrap="wrap" w="full">
                  <Button
                    asChild
                    variant={pathname === "/admin" ? "solid" : "ghost"}
                    colorPalette={ADMIN_COLOR_PALETTE}
                    size="sm"
                    flex={{ base: "1 1 calc(50% - 6px)", sm: "0 0 auto" }}
                  >
                    <NextLink href="/admin">Tổng quan</NextLink>
                  </Button>
                  <Button
                    asChild
                    variant={
                      pathname === "/admin/bookings" ? "solid" : "ghost"
                    }
                    colorPalette={ADMIN_COLOR_PALETTE}
                    size="sm"
                    flex={{ base: "1 1 calc(50% - 6px)", sm: "0 0 auto" }}
                  >
                    <NextLink href="/admin/bookings">Đơn thuê</NextLink>
                  </Button>
                  <Button
                    asChild
                    variant={
                      pathname === "/admin/expenses" ? "solid" : "ghost"
                    }
                    colorPalette={ADMIN_COLOR_PALETTE}
                    size="sm"
                    flex={{ base: "1 1 calc(50% - 6px)", sm: "0 0 auto" }}
                  >
                    <NextLink href="/admin/expenses">Chi tiêu</NextLink>
                  </Button>
                  <Button
                    asChild
                    variant={
                      pathname === "/admin/customers" ||
                      pathname.startsWith("/admin/customers/")
                        ? "solid"
                        : "ghost"
                    }
                    colorPalette={ADMIN_COLOR_PALETTE}
                    size="sm"
                    flex={{ base: "1 1 calc(50% - 6px)", sm: "0 0 auto" }}
                  >
                    <NextLink href="/admin/customers">Khách hàng</NextLink>
                  </Button>
                  <Button
                    asChild
                    variant={
                      pathname === "/admin/cameras" ? "solid" : "ghost"
                    }
                    colorPalette={ADMIN_COLOR_PALETTE}
                    size="sm"
                    flex={{ base: "1 1 calc(50% - 6px)", sm: "0 0 auto" }}
                  >
                    <NextLink href="/admin/cameras">Máy ảnh</NextLink>
                  </Button>
                </HStack>
                <Button
                  type="button"
                  variant="outline"
                  colorPalette={ADMIN_COLOR_PALETTE}
                  size="sm"
                  w={{ base: "full", sm: "auto" }}
                  alignSelf={{ sm: "flex-end" }}
                  onClick={handleLogout}
                >
                  Đăng xuất
                </Button>
              </Stack>
            </CardBody>
          </CardRoot>
          {children}
        </Stack>
      </Container>
    </Box>
  );
}
