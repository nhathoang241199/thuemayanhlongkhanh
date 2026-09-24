"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  CheckboxControl,
  CheckboxHiddenInput,
  CheckboxLabel,
  CheckboxRoot,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";

import { toastApiError } from "@/lib/admin-api";
import { APP_COLOR_PALETTE, cardSurfaceProps } from "@/lib/app-theme";
import {
  fetchShopFeatures,
  updateShopFeatures,
  type ShopFeatures,
} from "@/lib/shop-features";
import { toaster } from "@/lib/toaster";

export default function AdminFeaturesPage() {
  const [printEnabled, setPrintEnabled] = useState(true);
  const [depositEnabled, setDepositEnabled] = useState(true);
  const [shipEnabled, setShipEnabled] = useState(true);
  const [dayBookingEnabled, setDayBookingEnabled] = useState(true);
  const [saved, setSaved] = useState<ShopFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchShopFeatures();
      if (signal?.aborted) return;
      setPrintEnabled(json.printEnabled);
      setDepositEnabled(json.depositEnabled);
      setShipEnabled(json.shipEnabled);
      setDayBookingEnabled(json.dayBookingEnabled);
      setSaved(json);
    } catch (e) {
      if (signal?.aborted) return;
      const msg = toastApiError(e, "Lỗi tải cấu hình chức năng");
      if (msg) setError(msg);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const dirty =
    saved !== null &&
    (printEnabled !== saved.printEnabled ||
      depositEnabled !== saved.depositEnabled ||
      shipEnabled !== saved.shipEnabled ||
      dayBookingEnabled !== saved.dayBookingEnabled);

  const save = () => {
    void (async () => {
      setSaving(true);
      setError(null);
      try {
        const json = await updateShopFeatures({
          printEnabled,
          depositEnabled,
          shipEnabled,
          dayBookingEnabled,
        });
        setPrintEnabled(json.printEnabled);
        setDepositEnabled(json.depositEnabled);
        setShipEnabled(json.shipEnabled);
        setDayBookingEnabled(json.dayBookingEnabled);
        setSaved(json);
        toaster.success({ title: "Đã lưu cấu hình chức năng" });
      } catch (e) {
        const msg = toastApiError(e, "Không lưu được cấu hình");
        if (msg) setError(msg);
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={4}>
            <CardTitle textStyle="lg">Chức năng admin</CardTitle>
            <Text fontSize="sm" color="fg.muted">
              Bật hoặc tắt các tính năng trên giao diện quản trị theo từng chi
              nhánh.
            </Text>
            {error ? (
              <Text color="red.fg" fontSize="sm" fontWeight="medium">
                {error}
              </Text>
            ) : null}
            <Box>
              <CheckboxRoot
                checked={printEnabled}
                disabled={loading}
                colorPalette={APP_COLOR_PALETTE}
                onCheckedChange={(e) => setPrintEnabled(!!e.checked)}
              >
                <CheckboxHiddenInput />
                <CheckboxControl />
                <CheckboxLabel fontSize="sm">In hợp đồng</CheckboxLabel>
              </CheckboxRoot>
              <Text fontSize="xs" color="fg.muted" mt={1} pl={6}>
                Hiện nút in trên trang đơn thuê (mobile và desktop).
              </Text>
            </Box>
            <Box>
              <CheckboxRoot
                checked={depositEnabled}
                disabled={loading}
                colorPalette={APP_COLOR_PALETTE}
                onCheckedChange={(e) => setDepositEnabled(!!e.checked)}
              >
                <CheckboxHiddenInput />
                <CheckboxControl />
                <CheckboxLabel fontSize="sm">Đặt cọc</CheckboxLabel>
              </CheckboxRoot>
              <Text fontSize="xs" color="fg.muted" mt={1} pl={6}>
                Khi tắt, khách không cần thanh toán cọc online khi đặt lịch.
              </Text>
            </Box>
            <Box>
              <CheckboxRoot
                checked={shipEnabled}
                disabled={loading}
                colorPalette={APP_COLOR_PALETTE}
                onCheckedChange={(e) => setShipEnabled(!!e.checked)}
              >
                <CheckboxHiddenInput />
                <CheckboxControl />
                <CheckboxLabel fontSize="sm">Ship / giao hàng</CheckboxLabel>
              </CheckboxRoot>
              <Text fontSize="xs" color="fg.muted" mt={1} pl={6}>
                Khi tắt, ẩn tùy chọn giao hàng lúc khách đặt lịch.
              </Text>
            </Box>
            <Box>
              <CheckboxRoot
                checked={dayBookingEnabled}
                disabled={loading}
                colorPalette={APP_COLOR_PALETTE}
                onCheckedChange={(e) => setDayBookingEnabled(!!e.checked)}
              >
                <CheckboxHiddenInput />
                <CheckboxControl />
                <CheckboxLabel fontSize="sm">Đặt lịch theo ngày</CheckboxLabel>
              </CheckboxRoot>
              <Text fontSize="xs" color="fg.muted" mt={1} pl={6}>
                Khi tắt, khách bỏ bước chọn kiểu đặt lịch và vào thẳng đặt theo
                máy.
              </Text>
            </Box>
            <Button
              type="button"
              colorPalette={APP_COLOR_PALETTE}
              alignSelf="flex-start"
              loading={saving}
              disabled={loading || !dirty}
              onClick={save}
            >
              Lưu
            </Button>
          </Stack>
        </CardBody>
      </CardRoot>
    </Stack>
  );
}
