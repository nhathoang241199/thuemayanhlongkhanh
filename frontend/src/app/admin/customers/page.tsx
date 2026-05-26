"use client";

import {
  CardBody,
  CardRoot,
  CardTitle,
  createIcon,
  HStack,
  IconButton,
  Link,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
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
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/app/admin/bookings/booking-list-icons";
import {
  AdminDataCard,
  AdminDataCardHeader,
  AdminDataCardRow,
} from "@/components/admin/admin-data-card";
import { AdminResponsiveTable } from "@/components/admin/admin-responsive-table";
import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE, cardSurfaceProps } from "@/lib/app-theme";

import {
  CustomersSearchFields,
  type CustomerSearchField,
} from "./customers-search-fields";
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

const tableCellPad = { px: 4, py: 3 };

const PAGE_SIZE_OPTIONS = [10, 30, 50] as const;

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

/** API mới: { items, total }. API cũ / môi trường chưa deploy: mảng Customer[]. */
function normalizeCustomersListResponse(
  raw: unknown,
  requestedPage: number,
  pageSize: number,
): { items: Customer[]; total: number } {
  if (Array.isArray(raw)) {
    const total = raw.length;
    const page = Math.max(1, requestedPage);
    const start = (page - 1) * pageSize;
    return {
      items: raw.slice(start, start + pageSize),
      total,
    };
  }
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { items?: unknown }).items)
  ) {
    const o = raw as { items: Customer[]; total?: number };
    const total =
      typeof o.total === "number" && !Number.isNaN(o.total)
        ? o.total
        : o.items.length;
    return { items: o.items, total };
  }
  return { items: [], total: 0 };
}

function CustomerMobileCard({
  customer: c,
  onOpen,
}: {
  customer: Customer;
  onOpen: () => void;
}) {
  return (
    <AdminDataCard
      cursor="pointer"
      hoverBg="ocean.100"
      onClick={onOpen}
    >
      <AdminDataCardHeader>
        <HStack justify="space-between" align="center" gap={2}>
          <Text fontWeight="semibold">{c.name}</Text>
          <CustomerTagBadge tag={c.customerTag} />
        </HStack>
      </AdminDataCardHeader>
      <AdminDataCardRow label="SĐT">{c.phone}</AdminDataCardRow>
      <AdminDataCardRow label="Xác minh">
        {c.isVerified ? (
          <VerifiedCheckIcon
            boxSize="1.35em"
            color="green.600"
            aria-label="Đã xác minh"
          />
        ) : (
          <Text color="fg.muted">—</Text>
        )}
      </AdminDataCardRow>
      <AdminDataCardRow label="Ảnh minh chứng">
        {c.verificationImageUrls.length}
      </AdminDataCardRow>
      <AdminDataCardRow label="Facebook">
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
      </AdminDataCardRow>
      <AdminDataCardRow label="Ghi chú">
        {c.note ? (
          <Text lineClamp={3} title={c.note}>
            {c.note}
          </Text>
        ) : (
          <Text color="fg.muted">—</Text>
        )}
      </AdminDataCardRow>
      <AdminDataCardRow label="Ngày tạo">
        {formatCreatedAt(c.createdAt)}
      </AdminDataCardRow>
    </AdminDataCard>
  );
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);
  const [searchField, setSearchField] = useState<CustomerSearchField>("phone");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDebouncedSearchChange = useCallback(
    (next: { field: CustomerSearchField; query: string }) => {
      setSearchField(next.field);
      setSearchQuery(next.query);
      setPage(1);
    },
    [],
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );
  const clampedPage = useMemo(
    () => Math.min(Math.max(1, page), totalPages),
    [page, totalPages],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        let requestedPage = page;
        let json: {
          items: Customer[];
          total: number;
        };

        for (let attempt = 0; attempt < 2; attempt++) {
          const params = new URLSearchParams({
            page: String(requestedPage),
            pageSize: String(pageSize),
          });
          const trimmedSearch = searchQuery.trim();
          if (trimmedSearch.length > 0) {
            params.set("searchField", searchField);
            params.set("search", trimmedSearch);
          }
          const res = await fetch(`${apiBase()}/api/customers?${params}`, {
            credentials: "include",
          });
          await throwIfNotOk(res, "Lỗi tải dữ liệu");
          const raw = await res.json();
          json = normalizeCustomersListResponse(
            raw,
            requestedPage,
            pageSize,
          );
          if (cancelled) return;
          const tp = Math.max(1, Math.ceil(json.total / pageSize));
          if (json.total > 0 && requestedPage > tp) {
            requestedPage = tp;
            continue;
          }
          break;
        }

        if (cancelled) return;
        setCustomers(json!.items);
        setTotal(json!.total);
        if (json!.total === 0 && page !== 1) {
          setPage(1);
        } else if (json!.total > 0 && requestedPage !== page) {
          setPage(requestedPage);
        }
      } catch (e) {
        if (cancelled) return;
        setCustomers(null);
        setTotal(0);
        const msg = toastApiError(e, "Lỗi tải dữ liệu");
        if (msg) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, searchField, searchQuery]);

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={4}>
            <CardTitle textStyle="2xl">Khách hàng</CardTitle>
            <CustomersSearchFields
              appliedField={searchField}
              appliedQuery={searchQuery}
              onDebouncedChange={handleDebouncedSearchChange}
            />
          </Stack>
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

      {!loading && !error && customers !== null && total === 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Text color="fg.muted" textAlign="center">
              {searchQuery.trim()
                ? "Không tìm thấy khách phù hợp số điện thoại hoặc tên."
                : "Chưa có khách nào trong hệ thống."}
            </Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {!loading && !error && customers !== null && total > 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody p={0}>
            <Stack gap={0}>
              <AdminResponsiveTable
                table={
                  <TableScrollArea rounded="l2">
                    <TableRoot size="sm" native>
                      <TableHeader>
                        <TableRow>
                          <TableColumnHeader {...tableCellPad}>
                            Tên
                          </TableColumnHeader>
                          <TableColumnHeader {...tableCellPad}>
                            SĐT
                          </TableColumnHeader>
                          <TableColumnHeader {...tableCellPad}>
                            Tag
                          </TableColumnHeader>
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
                }
                cards={customers.map((c) => (
                  <CustomerMobileCard
                    key={c.id}
                    customer={c}
                    onOpen={() => router.push(`/admin/customers/${c.id}`)}
                  />
                ))}
              />

              <HStack
                px={4}
                py={3}
                minH="3.25rem"
                borderTopWidth="1px"
                borderTopColor="gray.200"
                bg="white"
                justify="space-between"
                align="center"
                w="full"
                gap={3}
              >
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color="fg.muted"
                  lineHeight="1"
                  flexShrink={0}
                >
                  {clampedPage}/{totalPages}
                </Text>
                <HStack gap={2} justify="flex-end" align="center" flexShrink={0}>
                  <NativeSelectRoot size="sm" w="3.75rem" minW="3.75rem">
                    <NativeSelectField
                      value={String(pageSize)}
                      bg="white"
                      borderWidth="1px"
                      borderColor="gray.200"
                      aria-label="Số khách mỗi trang"
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </NativeSelectField>
                    <NativeSelectIndicator />
                  </NativeSelectRoot>
                  <IconButton
                    type="button"
                    size="md"
                    variant="outline"
                    colorPalette={APP_COLOR_PALETTE}
                    aria-label="Trang trước"
                    disabled={clampedPage <= 1 || loading}
                    onClick={() => setPage(clampedPage - 1)}
                  >
                    <ChevronLeftIcon boxSize="1.25rem" />
                  </IconButton>
                  <IconButton
                    type="button"
                    size="md"
                    variant="outline"
                    colorPalette={APP_COLOR_PALETTE}
                    aria-label="Trang sau"
                    disabled={clampedPage >= totalPages || loading}
                    onClick={() => setPage(clampedPage + 1)}
                  >
                    <ChevronRightIcon boxSize="1.25rem" />
                  </IconButton>
                </HStack>
              </HStack>
            </Stack>
          </CardBody>
        </CardRoot>
      ) : null}
    </Stack>
  );
}
