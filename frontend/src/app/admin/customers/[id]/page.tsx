"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  HStack,
  Link,
  Stack,
  SwitchControl,
  SwitchHiddenInput,
  SwitchRoot,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE, cardSurfaceProps } from "@/lib/app-theme";

import { CustomerTagBadge } from "../customer-tag-badge";
import { VerificationImageManager } from "../verification-image-manager";

type Customer = {
  id: string;
  name: string;
  phone: string;
  facebookUrl: string | null;
  verificationImageUrls: string[];
  isVerified: boolean;
  customerTag: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

const createdAtFmt = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return createdAtFmt.format(d);
}

function parseVerificationUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0,
  );
}

function normalizeCustomer(raw: Customer): Customer {
  return {
    ...raw,
    verificationImageUrls: parseVerificationUrls(raw.verificationImageUrls),
  };
}

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifySaving, setVerifySaving] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      setCustomer(null);
      try {
        const res = await fetch(`${apiBase()}/api/customers/${id}`, {
          credentials: "include",
          signal: ac.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        const json = normalizeCustomer((await res.json()) as Customer);
        if (!ac.signal.aborted) setCustomer(json);
      } catch (e) {
        if (ac.signal.aborted) return;
        setCustomer(null);
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [id]);

  const persistVerified = (nextVerified: boolean, revertTo: boolean) => {
    if (!id) return;
    void (async () => {
      setVerifySaving(true);
      setVerifyError(null);
      try {
        const res = await fetch(`${apiBase()}/api/customers/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isVerified: nextVerified }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        const json = normalizeCustomer((await res.json()) as Customer);
        setCustomer(json);
      } catch (e) {
        setVerifyError(
          e instanceof Error ? e.message : "Không cập nhật được xác minh",
        );
        setCustomer((c) =>
          c ? { ...c, isVerified: revertTo } : c,
        );
      } finally {
        setVerifySaving(false);
      }
    })();
  };

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        
        <CardBody>
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
            <Box>
              <CardTitle textStyle="2xl">
                {customer?.name ?? "Khách hàng"}
              </CardTitle>
            </Box>
            <Button asChild variant="outline" colorPalette={APP_COLOR_PALETTE} size="sm">
              <NextLink href="/admin/customers">Quay lại danh sách</NextLink>
            </Button>
          </HStack>
        </CardBody>
      </CardRoot>

      {error ? (
        <CardRoot borderWidth="1px" borderColor="red.300" bg="red.50">
          <CardBody>
            <Text color="red.fg" fontWeight="medium">
              {error}
            </Text>
            <Button asChild mt={4} variant="solid" colorPalette={APP_COLOR_PALETTE} size="sm">
              <NextLink href="/admin/customers">Về danh sách</NextLink>
            </Button>
          </CardBody>
        </CardRoot>
      ) : null}

      {loading && !customer && !error ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Text>Đang tải…</Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {customer ? (
        <Stack gap={6}>
          <CardRoot {...cardSurfaceProps}>
            <CardBody>
              <Stack gap={3}>
                  <Box>
                    <Text fontSize="sm" color="fg.muted">
                      Số điện thoại
                    </Text>
                    <Text fontWeight="semibold">{customer.phone}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted">
                      Tag
                    </Text>
                    <CustomerTagBadge tag={customer.customerTag} />
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={2}>
                      Xác minh
                    </Text>
                    <SwitchRoot
                      checked={customer.isVerified}
                      disabled={verifySaving}
                      colorPalette="green"
                      size="md"
                      aria-label="Trạng thái xác minh"
                      onCheckedChange={({ checked }) => {
                        const previousVerified = customer.isVerified;
                        setCustomer((c) =>
                          c ? { ...c, isVerified: checked } : c,
                        );
                        persistVerified(checked, previousVerified);
                      }}
                    >
                      <SwitchHiddenInput />
                      <SwitchControl />
                    </SwitchRoot>
                    
                    {verifyError ? (
                      <Text fontSize="sm" color="red.fg" mt={1}>
                        {verifyError}
                      </Text>
                    ) : null}
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted">
                      Facebook
                    </Text>
                    {customer.facebookUrl ? (
                      <Link
                        href={customer.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        colorPalette={APP_COLOR_PALETTE}
                      >
                        {customer.facebookUrl}
                      </Link>
                    ) : (
                      <Text color="fg.muted">—</Text>
                    )}
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="fg.muted">
                      Ghi chú
                    </Text>
                    <Text whiteSpace="pre-wrap">{customer.note ?? "—"}</Text>
                  </Box>
                  <HStack gap={6} flexWrap="wrap">
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Ngày tạo
                      </Text>
                      <Text>{formatDt(customer.createdAt)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Cập nhật
                      </Text>
                      <Text>{formatDt(customer.updatedAt)}</Text>
                    </Box>
                  </HStack>
              </Stack>
            </CardBody>
          </CardRoot>

          <CardRoot {...cardSurfaceProps}>
            <CardBody>
              <CardTitle textStyle="lg" mb={4}>
                Ảnh CCCD / xác minh
              </CardTitle>
              <VerificationImageManager
                customerId={customer.id}
                urls={customer.verificationImageUrls}
                onUpdated={(verificationImageUrls) =>
                  setCustomer((c) =>
                    c ? { ...c, verificationImageUrls } : c,
                  )
                }
              />
            </CardBody>
          </CardRoot>
        </Stack>
      ) : null}
    </Stack>
  );
}
