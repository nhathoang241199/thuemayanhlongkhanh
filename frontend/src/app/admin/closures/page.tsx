"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  HStack,
  Stack,
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableRoot,
  TableRow,
  TableScrollArea,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AdminDataCard,
  AdminDataCardActions,
  AdminDataCardHeader,
  AdminDataCardRow,
} from "@/components/admin/admin-data-card";
import { AdminResponsiveTable } from "@/components/admin/admin-responsive-table";
import { MonthCalendar } from "@/components/booking/month-calendar";
import {
  APP_COLOR_PALETTE,
  cardSurfaceProps,
  fieldInputProps,
  titleColor,
} from "@/lib/app-theme";
import { apiBase } from "@/lib/api-base";
import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import {
  dayCountInclusive,
  formatDateVi,
} from "@/lib/booking-api";
import { expenseDateFromIso } from "@/lib/expense-date";
import { toaster } from "@/lib/toaster";

type ShopClosure = {
  id: string;
  startDate: string;
  endDate: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

function nowYm(): { year: number; month: number } {
  const t = new Date();
  const vn = new Date(t.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth() + 1,
  };
}

function closureDateKey(iso: string): string {
  return expenseDateFromIso(iso);
}

function ClosureMobileCard({
  row,
  onDelete,
}: {
  row: ShopClosure;
  onDelete: () => void;
}) {
  const start = closureDateKey(row.startDate);
  const end = closureDateKey(row.endDate);
  const days = dayCountInclusive(start, end);

  return (
    <AdminDataCard>
      <AdminDataCardHeader>
        <Text fontWeight="semibold" color={titleColor}>
          {start === end
            ? formatDateVi(start)
            : `${formatDateVi(start)} → ${formatDateVi(end)}`}
        </Text>
      </AdminDataCardHeader>
      <AdminDataCardRow label="Số ngày">{days} ngày</AdminDataCardRow>
      <AdminDataCardRow label="Ghi chú">
        {row.note ? (
          <Text whiteSpace="pre-wrap">{row.note}</Text>
        ) : (
          <Text color="fg.muted">—</Text>
        )}
      </AdminDataCardRow>
      <AdminDataCardActions>
        <Button
          type="button"
          size="sm"
          variant="outline"
          flex={1}
          colorPalette="red"
          onClick={onDelete}
        >
          Xóa
        </Button>
      </AdminDataCardActions>
    </AdminDataCard>
  );
}

export default function AdminClosuresPage() {
  const initialYm = useMemo(() => nowYm(), []);
  const [calendarYm, setCalendarYm] = useState(initialYm);
  const [closures, setClosures] = useState<ShopClosure[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ShopClosure | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadClosures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/api/shop-closures`, {
        credentials: "include",
      });
      await throwIfNotOk(res, "Không tải được ngày nghỉ");
      setClosures((await res.json()) as ShopClosure[]);
    } catch (e) {
      setClosures(null);
      setError(e instanceof Error ? e.message : "Không tải được ngày nghỉ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClosures();
  }, [loadClosures]);

  const handleRangeChange = (start: string, end: string) => {
    setRangeStart(start);
    setRangeEnd(end);
  };

  const handleAdd = async () => {
    if (!rangeStart || !rangeEnd) {
      toaster.create({
        type: "warning",
        title: "Chọn khoảng ngày nghỉ trên lịch",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase()}/api/shop-closures`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: rangeStart,
          endDate: rangeEnd,
          note: note.trim() || undefined,
        }),
      });
      await throwIfNotOk(res, "Không thêm được ngày nghỉ");
      toaster.create({ type: "success", title: "Đã thêm ngày nghỉ" });
      setRangeStart(null);
      setRangeEnd(null);
      setNote("");
      await loadClosures();
    } catch (e) {
      toastApiError(e, "Không thêm được ngày nghỉ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${apiBase()}/api/shop-closures/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      await throwIfNotOk(res, "Không xóa được ngày nghỉ");
      toaster.create({ type: "success", title: "Đã xóa ngày nghỉ" });
      setDeleteTarget(null);
      await loadClosures();
    } catch (e) {
      toastApiError(e, "Không xóa được ngày nghỉ");
    } finally {
      setDeleting(false);
    }
  };

  const tableCellPad = { px: 4, py: 3 };

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={4}>
            <CardTitle color={titleColor}>Thêm ngày nghỉ</CardTitle>
            <Text fontSize="sm" color="fg.muted" lineHeight="tall">
              Chọn khoảng ngày shop đóng cửa. Khách không thể đặt lịch trong
              những ngày này; admin vẫn tạo đơn thủ công nếu cần.
            </Text>
            <Box maxW="sm" mx="auto" w="full">
              <MonthCalendar
                year={calendarYm.year}
                month={calendarYm.month}
                startDate={rangeStart}
                endDate={rangeEnd}
                onViewChange={(y, m) => setCalendarYm({ year: y, month: m })}
                onRangeChange={handleRangeChange}
                allowUnavailableDays
              />
            </Box>
            {rangeStart && rangeEnd ? (
              <Text fontSize="sm" textAlign="center" color="fg.muted">
                {rangeStart === rangeEnd
                  ? formatDateVi(rangeStart)
                  : `${formatDateVi(rangeStart)} → ${formatDateVi(rangeEnd)}`}{" "}
                ({dayCountInclusive(rangeStart, rangeEnd)} ngày)
              </Text>
            ) : null}
            <Textarea
              {...fieldInputProps}
              placeholder="Ghi chú (tùy chọn)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
            <Button
              type="button"
              colorPalette={APP_COLOR_PALETTE}
              loading={submitting}
              onClick={() => void handleAdd()}
            >
              Thêm ngày nghỉ
            </Button>
          </Stack>
        </CardBody>
      </CardRoot>

      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={4}>
            <HStack justify="space-between" align="center">
              <CardTitle color={titleColor}>Danh sách ngày nghỉ</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                colorPalette={APP_COLOR_PALETTE}
                loading={loading}
                onClick={() => void loadClosures()}
              >
                Tải lại
              </Button>
            </HStack>

            {error ? (
              <Text color="red.fg" fontSize="sm">
                {error}
              </Text>
            ) : null}

            {closures && closures.length === 0 && !loading ? (
              <Text fontSize="sm" color="fg.muted">
                Chưa có ngày nghỉ nào.
              </Text>
            ) : null}

            <AdminResponsiveTable
              table={
                <TableScrollArea>
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader {...tableCellPad}>
                          Từ ngày
                        </TableColumnHeader>
                        <TableColumnHeader {...tableCellPad}>
                          Đến ngày
                        </TableColumnHeader>
                        <TableColumnHeader {...tableCellPad}>
                          Số ngày
                        </TableColumnHeader>
                        <TableColumnHeader {...tableCellPad}>
                          Ghi chú
                        </TableColumnHeader>
                        <TableColumnHeader {...tableCellPad} textAlign="end">
                          Thao tác
                        </TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(closures ?? []).map((row) => {
                        const start = closureDateKey(row.startDate);
                        const end = closureDateKey(row.endDate);
                        const days = dayCountInclusive(start, end);
                        return (
                          <TableRow key={row.id}>
                            <TableCell {...tableCellPad}>
                              {formatDateVi(start)}
                            </TableCell>
                            <TableCell {...tableCellPad}>
                              {formatDateVi(end)}
                            </TableCell>
                            <TableCell {...tableCellPad}>{days}</TableCell>
                            <TableCell {...tableCellPad}>
                              {row.note ?? "—"}
                            </TableCell>
                            <TableCell {...tableCellPad} textAlign="end">
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                colorPalette="red"
                                onClick={() => setDeleteTarget(row)}
                              >
                                Xóa
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </TableRoot>
                </TableScrollArea>
              }
              cards={
                <>
                  {(closures ?? []).map((row) => (
                    <ClosureMobileCard
                      key={row.id}
                      row={row}
                      onDelete={() => setDeleteTarget(row)}
                    />
                  ))}
                </>
              }
            />
          </Stack>
        </CardBody>
      </CardRoot>

      <DialogRoot
        open={deleteTarget !== null}
        onOpenChange={(e) => {
          if (!e.open) setDeleteTarget(null);
        }}
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xóa ngày nghỉ?</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Text fontSize="sm">
                Khách sẽ có thể đặt lịch lại trong khoảng ngày này.
              </Text>
            </DialogBody>
            <DialogFooter>
              <DialogCloseTrigger asChild>
                <Button type="button" variant="outline">
                  Hủy
                </Button>
              </DialogCloseTrigger>
              <Button
                type="button"
                colorPalette="red"
                loading={deleting}
                onClick={() => void handleDelete()}
              >
                Xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Stack>
  );
}
