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
import { MotionConfig, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { identifyCustomer, sessionFromIdentify } from "@/lib/api";
import {
  getSession,
  markHomeIntro,
  setSession,
} from "@/lib/customer-session";
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

const easeOut = [0.22, 1, 0.36, 1] as const;

const cardMotion = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: easeOut },
  },
};

const fieldsMotion = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const fieldMotion = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOut },
  },
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
        markHomeIntro();
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
      <MotionConfig reducedMotion="user">
      <motion.div
        initial="hidden"
        animate="show"
        variants={cardMotion}
        style={{ width: "100%", maxWidth: "28rem" }}
      >
        <CardRoot w="full" {...userCardProps}>
          <CardHeader>
            <CardTitle textStyle="xl" color={titleColor}>
              {getSiteTitle()}
            </CardTitle>
          </CardHeader>
          <CardBody>
            <motion.div initial="hidden" animate="show" variants={fieldsMotion}>
              <Stack gap={4}>
                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Text color="red.fg" fontSize="sm" fontWeight="medium">
                      {error}
                    </Text>
                  </motion.div>
                ) : null}
                <motion.div variants={fieldMotion}>
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
                </motion.div>
                <motion.div variants={fieldMotion}>
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
                </motion.div>
                <motion.div variants={fieldMotion}>
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
                </motion.div>
              </Stack>
            </motion.div>
          </CardBody>
        </CardRoot>
      </motion.div>
      </MotionConfig>
    </Box>
  );
}
