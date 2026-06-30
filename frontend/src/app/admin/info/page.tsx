"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  Input,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";

import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE, cardSurfaceProps, fieldInputProps } from "@/lib/app-theme";
import { toaster } from "@/lib/toaster";

type ShopInfo = {
  phone: string;
  address: string;
  mapUrl: string;
  updatedAt?: string;
};

export default function AdminInfoPage() {
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [saved, setSaved] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/api/shop-info`, {
        credentials: "include",
        signal,
      });
      await throwIfNotOk(res, "Lỗi tải thông tin shop");
      const json = (await res.json()) as ShopInfo;
      if (!signal?.aborted) {
        setPhone(json.phone);
        setAddress(json.address);
        setMapUrl(json.mapUrl);
        setSaved(json);
      }
    } catch (e) {
      if (signal?.aborted) return;
      const msg = toastApiError(e, "Lỗi tải thông tin shop");
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
    (phone !== saved.phone ||
      address !== saved.address ||
      mapUrl !== saved.mapUrl);

  const save = () => {
    void (async () => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase()}/api/shop-info`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, address, mapUrl }),
        });
        await throwIfNotOk(res, "Không lưu được thông tin");
        const json = (await res.json()) as ShopInfo;
        setPhone(json.phone);
        setAddress(json.address);
        setMapUrl(json.mapUrl);
        setSaved(json);
        toaster.success({ title: "Đã lưu thông tin shop" });
      } catch (e) {
        const msg = toastApiError(e, "Không lưu được thông tin");
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
            <CardTitle textStyle="lg">Thông tin shop</CardTitle>
            <Text fontSize="sm" color="fg.muted">
              Hiển thị trên trang chủ khách (số điện thoại và địa chỉ).
            </Text>
            {error ? (
              <Text color="red.fg" fontSize="sm" fontWeight="medium">
                {error}
              </Text>
            ) : null}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Số điện thoại
              </Text>
              <Input
                type="tel"
                value={phone}
                placeholder="VD: 0901234567"
                disabled={loading}
                {...fieldInputProps}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Địa chỉ
              </Text>
              <Textarea
                value={address}
                rows={3}
                placeholder="VD: 123 Nguyễn Du, Long Khánh, Đồng Nai"
                disabled={loading}
                {...fieldInputProps}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Link Google Maps
              </Text>
              <Input
                type="url"
                value={mapUrl}
                placeholder="https://maps.app.goo.gl/..."
                disabled={loading}
                {...fieldInputProps}
                onChange={(e) => setMapUrl(e.target.value)}
              />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Để trống = dùng link mặc định trong cấu hình site.
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
