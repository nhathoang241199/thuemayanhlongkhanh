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
import { useEffect, useState } from "react";

import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE, cardSurfaceProps } from "@/lib/app-theme";
import { clampDiscountPercent } from "@/lib/rental-pricing";
import { toaster } from "@/lib/toaster";

type EquipmentDiscountState = {
  discountPercent: number;
  startDate: string | null;
  endDate: string | null;
};

type ApplyEquipmentDiscountResponse = EquipmentDiscountState & {
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

function formatDateVi(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export function AdminBulkDiscountPanel({
  onApplied,
}: AdminBulkDiscountPanelProps) {
  const [value, setValue] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${apiBase()}/api/stats/equipment-discount`, {
          credentials: "include",
        });
        await throwIfNotOk(res, "Không tải được khuyến mãi");
        const json = (await res.json()) as EquipmentDiscountState;
        setValue(String(json.discountPercent ?? 0));
        setStartDate(json.startDate ?? "");
        setEndDate(json.endDate ?? "");
      } catch {
        /* giữ mặc định */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const apply = () => {
    const pct = parseDiscountInput(value);
    if (pct === null) {
      setError("Nhập % từ 0 đến 100.");
      return;
    }
    const hasStart = startDate.trim().length > 0;
    const hasEnd = endDate.trim().length > 0;
    if (hasStart !== hasEnd) {
      setError("Cần nhập cả Từ ngày và Đến ngày, hoặc để trống cả hai.");
      return;
    }
    if (hasStart && hasEnd && startDate > endDate) {
      setError("Từ ngày phải trước hoặc bằng Đến ngày.");
      return;
    }

    const dateLabel =
      hasStart && hasEnd
        ? ` từ ${formatDateVi(startDate)} đến ${formatDateVi(endDate)}`
        : "";
    const label =
      pct === 0
        ? "Bỏ giảm giá (0%) cho tất cả máy ảnh và ống kính?"
        : `Áp dụng giảm ${pct}%${dateLabel} cho tất cả máy ảnh và ống kính?`;
    if (!window.confirm(label)) return;

    void (async () => {
      setApplying(true);
      setError(null);
      try {
        const body: Record<string, unknown> = { discountPercent: pct };
        if (hasStart && hasEnd) {
          body.startDate = startDate;
          body.endDate = endDate;
        }
        const res = await fetch(`${apiBase()}/api/stats/equipment-discount`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await throwIfNotOk(res, "Không áp dụng được giảm giá");
        const json = (await res.json()) as ApplyEquipmentDiscountResponse;
        const applied = clampDiscountPercent(json.discountPercent);
        setValue(String(applied));
        setStartDate(json.startDate ?? "");
        setEndDate(json.endDate ?? "");
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
          <Box flex="1" minW={{ md: "10rem" }}>
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
              disabled={loading}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
            />
          </Box>
          <Box flex="1" minW={{ md: "10rem" }}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Từ ngày
            </Text>
            <Input
              type="date"
              value={startDate}
              bg="white"
              disabled={loading}
              onChange={(e) => {
                setStartDate(e.target.value);
                setError(null);
              }}
            />
          </Box>
          <Box flex="1" minW={{ base: "10rem" }}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Đến ngày
            </Text>
            <Input
              type="date"
              value={endDate}
              bg="white"
              disabled={loading}
              onChange={(e) => {
                setEndDate(e.target.value);
                setError(null);
              }}
            />
          </Box>
          <Button
            type="button"
            size="sm"
            colorPalette={APP_COLOR_PALETTE}
            loading={applying}
            disabled={loading}
            onClick={apply}
            alignSelf={{ base: "stretch", md: "auto" }}
          >
            Áp dụng
          </Button>
        </HStack>
        <Text fontSize="xs" color="fg.muted" mt={2}>
          Để trống ngày = giảm mọi đơn. Có ngày = chỉ đơn có ngày thuê trùng
          khoảng khuyến mãi.
        </Text>
        {error ? (
          <Text color="red.fg" fontSize="sm" mt={2} fontWeight="medium">
            {error}
          </Text>
        ) : null}
      </CardBody>
    </CardRoot>
  );
}
