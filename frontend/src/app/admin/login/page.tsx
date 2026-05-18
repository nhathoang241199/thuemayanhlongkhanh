"use client";

import {
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import {
  ADMIN_COLOR_PALETTE,
  adminShellBg,
  cardSurfaceProps,
} from "@/lib/app-theme";
import { adminLogin } from "@/lib/admin-auth";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin";

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        await adminLogin(username.trim(), password);
        router.replace(from.startsWith("/admin") ? from : "/admin");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <Stack
      minH="100dvh"
      align="center"
      justify="center"
      bg={adminShellBg}
      px={4}
      py={8}
    >
      <CardRoot {...cardSurfaceProps} w="full" maxW="md">
        <CardBody>
          <Stack gap={5} as="form" onSubmit={submit}>
            <CardTitle textStyle="xl">Đăng nhập Admin</CardTitle>
            <Text fontSize="sm" color="fg.muted">
              Thuê máy ảnh Long Khánh — khu vực quản trị
            </Text>
            <Stack gap={2}>
              <Text fontSize="sm" fontWeight="medium">
                Tên đăng nhập
              </Text>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                bg="white"
              />
            </Stack>
            <Stack gap={2}>
              <Text fontSize="sm" fontWeight="medium">
                Mật khẩu
              </Text>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                bg="white"
              />
            </Stack>
            {error ? (
              <Text fontSize="sm" color="red.fg" fontWeight="medium">
                {error}
              </Text>
            ) : null}
            <Button
              type="submit"
              colorPalette={ADMIN_COLOR_PALETTE}
              loading={loading}
              w="full"
            >
              Đăng nhập
            </Button>
          </Stack>
        </CardBody>
      </CardRoot>
    </Stack>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<Text p={8}>Đang tải…</Text>}>
      <AdminLoginForm />
    </Suspense>
  );
}
