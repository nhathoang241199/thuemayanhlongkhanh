"use client";

import {
  CardBody,
  CardDescription,
  CardHeader,
  CardRoot,
  CardTitle,
  createIcon,
  Link,
  Stack,
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableRoot,
  TableRow,
  TableScrollArea,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { APP_COLOR_PALETTE, cardSurfaceProps } from "@/lib/app-theme";

import { CustomerTagBadge } from "./customer-tag-badge";

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

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}

const tableCellPad = { px: 4, py: 3 };

const VerifiedCheckIcon = createIcon({
  displayName: "VerifiedCheckIcon",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 6 9 17l-5-5"
    />
  ),
});

const createdAtFmt = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return createdAtFmt.format(d);
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase()}/api/customers`, {
          credentials: "include",
          signal: ac.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        const json = (await res.json()) as Customer[];
        if (!ac.signal.aborted) setCustomers(json);
      } catch (e) {
        if (ac.signal.aborted) return;
        setCustomers(null);
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardHeader>
          <CardTitle textStyle="2xl">Khách hàng</CardTitle>
        </CardHeader>
        <CardBody>
          <CardDescription>
            Danh sách khách từ{" "}
            <Text as="span" fontWeight="semibold">
              GET /api/customers
            </Text>
            .
          </CardDescription>
        </CardBody>
      </CardRoot>

      {error ? (
        <CardRoot borderWidth="1px" borderColor="red.300" bg="red.50">
          <CardBody>
            <Text color="red.fg" fontWeight="medium">
              {error}
            </Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {loading && customers === null && !error ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Text>Đang tải danh sách…</Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {customers && customers.length === 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Text>Chưa có khách nào trong hệ thống.</Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {customers && customers.length > 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody p={0}>
            <TableScrollArea rounded="l2">
              <TableRoot size="sm" native>
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader {...tableCellPad}>Tên</TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>SĐT</TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>Tag</TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>
                      Xác minh
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>
                      Ảnh minh chứng
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>
                      Facebook
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>
                      Ghi chú
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>
                      Ngày tạo
                    </TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow
                      key={c.id}
                      cursor="pointer"
                      _hover={{ bg: "ocean.100" }}
                      onClick={() => {
                        router.push(`/admin/customers/${c.id}`);
                      }}
                    >
                      <TableCell fontWeight="medium" {...tableCellPad}>
                        {c.name}
                      </TableCell>
                      <TableCell {...tableCellPad}>{c.phone}</TableCell>
                      <TableCell {...tableCellPad}>
                        <CustomerTagBadge tag={c.customerTag} />
                      </TableCell>
                      <TableCell {...tableCellPad}>
                        {c.isVerified ? (
                          <VerifiedCheckIcon
                            boxSize="1.35em"
                            color="green.600"
                            aria-label="Đã xác minh"
                          />
                        ) : (
                          <Text color="fg.muted">—</Text>
                        )}
                      </TableCell>
                      <TableCell {...tableCellPad}>
                        {c.verificationImageUrls.length}
                      </TableCell>
                      <TableCell {...tableCellPad}>
                        {c.facebookUrl ? (
                          <Link
                            href={c.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            colorPalette={APP_COLOR_PALETTE}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Mở
                          </Link>
                        ) : (
                          <Text color="fg.muted">—</Text>
                        )}
                      </TableCell>
                      <TableCell maxW="14rem" {...tableCellPad}>
                        {c.note ? (
                          <Text lineClamp={2} title={c.note}>
                            {c.note}
                          </Text>
                        ) : (
                          <Text color="fg.muted">—</Text>
                        )}
                      </TableCell>
                      <TableCell whiteSpace="nowrap" {...tableCellPad}>
                        {formatCreatedAt(c.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableRoot>
            </TableScrollArea>
          </CardBody>
        </CardRoot>
      ) : null}
    </Stack>
  );
}
