"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { shipperLogin } from "@/lib/shipper-auth";
import {
  mutedAccentColor,
  titleColor,
  userBookingCardProps,
  userFieldInputProps,
  userSolidButtonProps,
} from "@/lib/user-theme";

export default function ShipperLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await shipperLogin(phone, password);
        router.replace("/ship");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Đăng nhập thất bại");
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <Stack gap={4} pt={6}>
      <Box>
        <Text textStyle="xl" fontWeight="bold" color={titleColor}>
          Đăng nhập shipper
        </Text>
        <Text fontSize="sm" color={mutedAccentColor}>
          Tài khoản là số điện thoại shop đã cấp.
        </Text>
      </Box>

      <CardRoot {...userBookingCardProps}>
        <CardBody>
          <Stack gap={4}>
            {error ? (
              <Text color="red.fg" fontSize="sm">
                {error}
              </Text>
            ) : null}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1} color={titleColor}>
                Số điện thoại
              </Text>
              <Input
                type="tel"
                value={phone}
                placeholder="0901234567"
                {...userFieldInputProps}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1} color={titleColor}>
                Mật khẩu
              </Text>
              <Input
                type="password"
                value={password}
                {...userFieldInputProps}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </Box>
            <Button {...userSolidButtonProps} loading={loading} onClick={submit}>
              Đăng nhập
            </Button>
          </Stack>
        </CardBody>
      </CardRoot>
    </Stack>
  );
}
