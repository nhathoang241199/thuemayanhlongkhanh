"use client";

import {
  Box,
  Button,
  CardBody,
  CardHeader,
  CardRoot,
  CardTitle,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { identifyCustomer, sessionFromIdentify } from "@/lib/api";
import { getSession, setSession } from "@/lib/customer-session";
import { normalizePhone } from "@/lib/normalize-phone";
import { getSiteTitle } from "@/lib/site-config";
import {
  APP_COLOR_PALETTE,
  titleColor,
  userCardProps,
  userFieldInputProps,
  userPageBg,
} from "@/lib/user-theme";

const fieldInputProps = {
  ...userFieldInputProps,
  size: "lg" as const,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) {
      router.replace("/home");
      return;
    }
    setReady(true);
  }, [router]);

  const submit = () => {
    const nameTrim = name.trim();
    const phoneNormalized = normalizePhone(phone);
    if (!nameTrim) {
      setError("Vui lòng nhập tên.");
      return;
    }
    if (phoneNormalized.length < 10 || !phoneNormalized.startsWith("0")) {
      setError("Số điện thoại không hợp lệ (vd. 0901234567 hoặc +84901234567).");
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await identifyCustomer(nameTrim, phoneNormalized);
        setSession(sessionFromIdentify(data));
        router.push("/home");
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Không thể xác nhận thông tin.",
        );
      } finally {
        setLoading(false);
      }
    })();
  };

  if (!ready) {
    return (
      <Box minH="100dvh" display="flex" alignItems="center" justifyContent="center">
        <Text color="fg.muted">Đang tải…</Text>
      </Box>
    );
  }

  return (
    <Box
      minH="100dvh"
      bg={userPageBg}
      colorPalette={APP_COLOR_PALETTE}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={8}
    >
      <CardRoot w="full" maxW="md" {...userCardProps}>
        <CardHeader>
          <CardTitle textStyle="xl" color={titleColor}>
            {getSiteTitle()}
          </CardTitle>
          <Text fontSize="sm" color="fg.muted" mt={1}>
            Nhập thông tin để xem và đặt lịch thuê máy
          </Text>
        </CardHeader>
        <CardBody>
          <Stack gap={4}>
            {error ? (
              <Text color="red.fg" fontSize="sm" fontWeight="medium">
                {error}
              </Text>
            ) : null}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Họ tên
              </Text>
              <Input
                value={name}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                {...fieldInputProps}
                onChange={(e) => setName(e.target.value)}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Số điện thoại
              </Text>
              <Input
                type="tel"
                value={phone}
                placeholder="0909123456"
                autoComplete="tel"
                inputMode="tel"
                {...fieldInputProps}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => {
                  const n = normalizePhone(phone);
                  if (n.length >= 10) setPhone(n);
                }}
              />
            </Box>
            <Button
              type="button"
              colorPalette={APP_COLOR_PALETTE}
              size="lg"
              w="full"
              loading={loading}
              onClick={submit}
            >
              Tiếp tục
            </Button>
          </Stack>
        </CardBody>
      </CardRoot>
    </Box>
  );
}
