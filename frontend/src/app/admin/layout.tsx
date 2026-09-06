"use client";

import {
  Box,
  BreadcrumbCurrentLink,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbRoot,
  BreadcrumbSeparator,
  Container,
  Stack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useState } from "react";

import {
  AdminDesktopNav,
  AdminMobileNavBar,
  AdminMobileNavDrawer,
} from "@/components/admin/admin-mobile-nav";
import { adminLogout } from "@/lib/admin-auth";
import { ADMIN_COLOR_PALETTE, adminShellBg } from "@/lib/app-theme";

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
  if (pathname === "/admin/lenses") {
    return [home, admin, { href: null, label: "Ống kính" }];
  }
  if (pathname === "/admin/customers") {
    return [home, admin, { href: null, label: "Khách hàng" }];
  }
  if (pathname === "/admin/bookings") {
    return [home, admin, { href: null, label: "Đơn thuê" }];
  }
  if (pathname === "/admin/ship-orders") {
    return [home, admin, { href: null, label: "Đơn giao" }];
  }
  if (pathname === "/admin/expenses") {
    return [home, admin, { href: null, label: "Chi tiêu" }];
  }
  if (pathname === "/admin/closures") {
    return [home, admin, { href: null, label: "Ngày nghỉ" }];
  }
  if (pathname === "/admin/terms") {
    return [home, admin, { href: null, label: "Điều khoản" }];
  }
  if (pathname === "/admin/messenger-learn") {
    return [home, admin, { href: null, label: "Học Messenger" }];
  }
  if (pathname === "/admin/fanpage-posts") {
    return [home, admin, { href: null, label: "Bài fanpage" }];
  }
  if (pathname === "/admin/blog-posts") {
    return [home, admin, { href: null, label: "Blog" }];
  }
  if (pathname === "/admin/info") {
    return [home, admin, { href: null, label: "Thông tin" }];
  }
  if (pathname === "/admin/shippers") {
    return [home, admin, { href: null, label: "Shipper" }];
  }
  if (pathname === "/admin/features") {
    return [home, admin, { href: null, label: "Chức năng" }];
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
  const [navOpen, setNavOpen] = useState(false);

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return <>{children}</>;
  }

  const crumbs = adminBreadcrumbs(pathname);
  const pageTitle = crumbs[crumbs.length - 1]?.label ?? "Admin";

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
      py={{ base: 4, md: 10 }}
    >
      <Container
        maxW={
          pathname === "/admin/bookings" || pathname === "/admin/ship-orders"
            ? "container.2xl"
            : "container.lg"
        }
        px={{ base: 3, md: 4 }}
      >
        <Stack gap={{ base: 4, lg: 6 }}>
          <AdminMobileNavBar
            pageTitle={pageTitle}
            onOpenMenu={() => setNavOpen(true)}
          />
          <AdminMobileNavDrawer
            pathname={pathname}
            open={navOpen}
            onOpenChange={setNavOpen}
            onLogout={handleLogout}
          />
          <BreadcrumbRoot
            size="sm"
            colorPalette={ADMIN_COLOR_PALETTE}
            display={{ base: "none", lg: "block" }}
          >
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
          <AdminDesktopNav pathname={pathname} onLogout={handleLogout} />
          {children}
        </Stack>
      </Container>
    </Box>
  );
}
