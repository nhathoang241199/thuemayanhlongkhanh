"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  HStack,
  Input,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";

import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE, cardSurfaceProps } from "@/lib/app-theme";
import { clampDiscountPercent } from "@/lib/rental-pricing";
import { toaster } from "@/lib/toaster";

type ApplyEquipmentDiscountResponse = {
  discountPercent: number;
  cameraCount: number;
  lensCount: number;
};

type AdminBulkDiscountPanelProps = {
  onApplied: (discountPercent: number) => void;
};

function parseDiscountInput(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return n;
}

export function AdminBulkDiscountPanel({
  onApplied,
}: AdminBulkDiscountPanelProps) {
  const [value, setValue] = useState("0");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const pct = parseDiscountInput(value);
    if (pct === null) {
      setError("Nhập % từ 0 đến 100.");
      return;
    }
    const label =
      pct === 0
        ? "Bỏ giảm giá (0%) cho tất cả máy ảnh và ống kính?"
        : `Áp dụng giảm ${pct}% cho tất cả máy ảnh và ống kính?`;
    if (!window.confirm(label)) return;

    void (async () => {
      setApplying(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase()}/api/stats/equipment-discount`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discountPercent: pct }),
        });
        await throwIfNotOk(res, "Không áp dụng được giảm giá");
        const json = (await res.json()) as ApplyEquipmentDiscountResponse;
        const applied = clampDiscountPercent(json.discountPercent);
        onApplied(applied);
        toaster.success({
          title:
            applied === 0
              ? "Đã bỏ giảm giá toàn bộ thiết bị"
              : `Đã áp dụng giảm ${applied}%`,
          description: `${json.cameraCount} máy, ${json.lensCount} ống kính`,
        });
      } catch (e) {
        const msg = toastApiError(e, "Không áp dụng được giảm giá");
        if (msg) setError(msg);
      } finally {
        setApplying(false);
      }
    })();
  };

  return (
    <CardRoot {...cardSurfaceProps}>
      <CardBody>
        <HStack
          gap={3}
          align={{ base: "stretch", md: "flex-end" }}
          flexWrap="wrap"
        >
          <Box flex="1" minW={{ md: "14rem" }}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Giảm giá tổng (%)
            </Text>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={value}
              bg="white"
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
            />
            <Text fontSize="xs" color="fg.muted" mt={1}>
              Áp dụng cho tất cả máy ảnh và ống kính. 0 = không giảm.
            </Text>
          </Box>
          <Button
            type="button"
            size="sm"
            colorPalette={APP_COLOR_PALETTE}
            loading={applying}
            onClick={apply}
            alignSelf={{ base: "stretch", md: "auto" }}
          >
            Áp dụng
          </Button>
        </HStack>
        {error ? (
          <Text color="red.fg" fontSize="sm" mt={2} fontWeight="medium">
            {error}
          </Text>
        ) : null}
      </CardBody>
    </CardRoot>
  );
}
