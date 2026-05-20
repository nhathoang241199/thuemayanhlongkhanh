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
  Input,
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
import {
  currentUtcYearMonth,
  dateInPeriod,
  defaultExpenseDateInput,
  expenseDateFromIso,
  expenseDateToIso,
  parseDateInput,
} from "@/lib/expense-date";
import {
  APP_COLOR_PALETTE,
  cardSurfaceProps,
  fieldInputProps,
  titleColor,
} from "@/lib/app-theme";
import { apiBase } from "@/lib/api-base";
import { toaster } from "@/lib/toaster";

const MONTH_LABELS_VI = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

type Expense = {
  id: string;
  title: string;
  amount: number;
  note: string | null;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
};

type ExpenseForm = {
  title: string;
  amount: string;
  expenseDate: string;
  note: string;
};

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const expenseDateFmt = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
});

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

const tableCellPad = { px: 4, py: 3 };

function formatExpenseDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return expenseDateFmt.format(d);
}

function ExpenseMobileCard({
  expense: e,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <AdminDataCard>
      <AdminDataCardHeader>
        <Text fontWeight="semibold">{e.title}</Text>
      </AdminDataCardHeader>
      <AdminDataCardRow label="Số tiền">
        <Text fontWeight="semibold" color={titleColor}>
          {vnd.format(e.amount)}
        </Text>
      </AdminDataCardRow>
      <AdminDataCardRow label="Ngày chi">
        {formatExpenseDate(e.expenseDate)}
      </AdminDataCardRow>
      <AdminDataCardRow label="Ghi chú">
        {e.note ? (
          <Text whiteSpace="pre-wrap">{e.note}</Text>
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
          colorPalette={APP_COLOR_PALETTE}
          onClick={onEdit}
        >
          Sửa
        </Button>
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

function emptyForm(periodYear: number, periodMonth: number): ExpenseForm {
  return {
    title: "",
    amount: "",
    expenseDate: defaultExpenseDateInput(periodYear, periodMonth),
    note: "",
  };
}

function formFromExpense(e: Expense): ExpenseForm {
  return {
    title: e.title,
    amount: String(e.amount),
    expenseDate: expenseDateFromIso(e.expenseDate),
    note: e.note ?? "",
  };
}

export default function AdminExpensesPage() {
  const { year: defaultYear, month: defaultMonth } = useMemo(
    () => currentUtcYearMonth(),
    [],
  );

  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(() =>
    emptyForm(defaultYear, defaultMonth),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = YEAR_MIN; y <= YEAR_MAX; y++) list.push(y);
    return list;
  }, []);

  const totalAmount = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const loadExpenses = useCallback(async (y: number, m: number, signal?: AbortSignal) => {
    const res = await fetch(
      `${apiBase()}/api/expenses?year=${y}&month=${m}`,
      { credentials: "include", signal },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    return (await res.json()) as Expense[];
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await loadExpenses(year, month, ac.signal);
        if (!ac.signal.aborted) setExpenses(json);
      } catch (e) {
        if (ac.signal.aborted) return;
        setExpenses(null);
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [year, month, loadExpenses]);

  const refreshList = useCallback(async () => {
    setError(null);
    try {
      const json = await loadExpenses(year, month);
      setExpenses(json);
    } catch (e) {
      setExpenses(null);
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    }
  }, [loadExpenses, year, month]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
    setForm(emptyForm(year, month));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(year, month));
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm(formFromExpense(e));
    setFormError(null);
    setFormOpen(true);
  };

  const submitForm = () => {
    const title = form.title.trim();
    if (!title) {
      setFormError("Tiêu đề không được để trống.");
      return;
    }
    const amount = Number.parseInt(form.amount.replace(/\D/g, ""), 10);
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError("Số tiền phải là số nguyên không âm.");
      return;
    }
    const dateParts = parseDateInput(form.expenseDate);
    if (!dateParts) {
      setFormError("Ngày chi không hợp lệ.");
      return;
    }
    if (!editing && !dateInPeriod(dateParts, year, month)) {
      setFormError(
        `Ngày chi phải thuộc ${MONTH_LABELS_VI[month - 1]} ${year} (UTC).`,
      );
      return;
    }
    const noteTrim = form.note.trim();
    const payload: {
      title: string;
      amount: number;
      expenseDate: string;
      note?: string;
    } = {
      title,
      amount,
      expenseDate: expenseDateToIso(dateParts),
    };
    if (noteTrim) payload.note = noteTrim;

    void (async () => {
      setFormSaving(true);
      setFormError(null);
      try {
        const url = editing
          ? `${apiBase()}/api/expenses/${encodeURIComponent(editing.id)}`
          : `${apiBase()}/api/expenses`;
        const res = await fetch(url, {
          method: editing ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        closeForm();
        toaster.success({
          title: editing ? "Đã cập nhật chi phí" : "Đã thêm chi phí",
        });
        await refreshList();
      } catch (e) {
        setFormError(
          e instanceof Error ? e.message : "Không lưu được chi phí.",
        );
      } finally {
        setFormSaving(false);
      }
    })();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    void (async () => {
      setDeleteSaving(true);
      try {
        const res = await fetch(
          `${apiBase()}/api/expenses/${encodeURIComponent(deleteTarget.id)}`,
          { method: "DELETE", credentials: "include" },
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        setDeleteTarget(null);
        toaster.success({ title: "Đã xóa chi phí" });
        await refreshList();
      } catch (e) {
        toaster.error({
          title: "Không xóa được",
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setDeleteSaving(false);
      }
    })();
  };

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <HStack
            justify="space-between"
            align="center"
            gap={4}
            flexWrap="wrap"
            mb={4}
          >
            <CardTitle textStyle="2xl">Chi tiêu</CardTitle>
            <Button type="button" size="sm" colorPalette={APP_COLOR_PALETTE} onClick={openCreate}>
              Thêm chi phí
            </Button>
          </HStack>
          <HStack gap={4} flexWrap="wrap" align="flex-end" w="full">
            <Box minW={{ md: "12rem" }} w={{ base: "full", md: "auto" }}>
              <Text fontSize="sm" mb={1} fontWeight="medium">
                Tháng
              </Text>
              <NativeSelectRoot size="sm">
                <NativeSelectField
                  value={String(month)}
                  {...fieldInputProps}
                  onChange={(e) =>
                    setMonth(Number.parseInt(e.target.value, 10))
                  }
                >
                  {MONTH_LABELS_VI.map((label, i) => (
                    <option key={label} value={String(i + 1)}>
                      {label}
                    </option>
                  ))}
                </NativeSelectField>
                <NativeSelectIndicator />
              </NativeSelectRoot>
            </Box>
            <Box minW={{ md: "8rem" }} w={{ base: "full", md: "auto" }}>
              <Text fontSize="sm" mb={1} fontWeight="medium">
                Năm
              </Text>
              <NativeSelectRoot size="sm">
                <NativeSelectField
                  value={String(year)}
                  {...fieldInputProps}
                  onChange={(e) =>
                    setYear(Number.parseInt(e.target.value, 10))
                  }
                >
                  {years.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </NativeSelectField>
                <NativeSelectIndicator />
              </NativeSelectRoot>
            </Box>
          </HStack>
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

      {loading && expenses === null && !error ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Text>Đang tải…</Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {expenses ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody p={0}>
            {expenses.length === 0 ? (
              <Box px={4} py={8}>
                <Text color="fg.muted" textAlign="center">
                  Không có chi phí trong {MONTH_LABELS_VI[month - 1]} {year}.
                </Text>
              </Box>
            ) : (
              <Stack gap={0}>
                <Box px={4} py={3} borderBottomWidth="1px" borderColor="gray.200">
                  <Text fontSize="sm" fontWeight="semibold">
                    Tổng: {vnd.format(totalAmount)} ({expenses.length} khoản)
                  </Text>
                </Box>
                <AdminResponsiveTable
                  table={
                    <TableScrollArea rounded="l2">
                      <TableRoot size="sm" native>
                        <TableHeader>
                          <TableRow>
                            <TableColumnHeader {...tableCellPad}>
                              Tiêu đề
                            </TableColumnHeader>
                            <TableColumnHeader maxW="14rem" {...tableCellPad}>
                              Ghi chú
                            </TableColumnHeader>
                            <TableColumnHeader {...tableCellPad}>
                              Ngày chi
                            </TableColumnHeader>
                            <TableColumnHeader {...tableCellPad} textAlign="end">
                              Số tiền
                            </TableColumnHeader>
                            <TableColumnHeader {...tableCellPad} textAlign="end">
                              Thao tác
                            </TableColumnHeader>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenses.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell fontWeight="medium" {...tableCellPad}>
                                {e.title}
                              </TableCell>
                              <TableCell maxW="14rem" {...tableCellPad}>
                                {e.note ? (
                                  <Text lineClamp={2} title={e.note}>
                                    {e.note}
                                  </Text>
                                ) : (
                                  <Text color="fg.muted">—</Text>
                                )}
                              </TableCell>
                              <TableCell whiteSpace="nowrap" {...tableCellPad}>
                                {formatExpenseDate(e.expenseDate)}
                              </TableCell>
                              <TableCell {...tableCellPad} textAlign="end">
                                {vnd.format(e.amount)}
                              </TableCell>
                              <TableCell {...tableCellPad} textAlign="end">
                                <HStack gap={2} justify="flex-end">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    onClick={() => openEdit(e)}
                                  >
                                    Sửa
                                  </Button>
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    colorPalette="red"
                                    onClick={() => setDeleteTarget(e)}
                                  >
                                    Xóa
                                  </Button>
                                </HStack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </TableRoot>
                    </TableScrollArea>
                  }
                  cards={expenses.map((e) => (
                    <ExpenseMobileCard
                      key={e.id}
                      expense={e}
                      onEdit={() => openEdit(e)}
                      onDelete={() => setDeleteTarget(e)}
                    />
                  ))}
                />
              </Stack>
            )}
          </CardBody>
        </CardRoot>
      ) : null}

      <DialogRoot
        open={formOpen}
        onOpenChange={(e) => {
          if (!e.open) closeForm();
        }}
        lazyMount
        unmountOnExit
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="md" w="full" mx={4}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Sửa chi phí" : "Thêm chi phí"}
              </DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <Stack gap={4}>
                {formError ? (
                  <Text color="red.fg" fontSize="sm" fontWeight="medium">
                    {formError}
                  </Text>
                ) : null}
                {!editing ? (
                  <Text fontSize="sm" color="fg.muted">
                    Ghi vào {MONTH_LABELS_VI[month - 1]} {year} (UTC)
                  </Text>
                ) : null}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Tiêu đề
                  </Text>
                  <Input
                    value={form.title}
                    maxLength={255}
                    {...fieldInputProps}
                    onChange={(ev) =>
                      setForm((f) => ({ ...f, title: ev.target.value }))
                    }
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Số tiền (VND)
                  </Text>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={form.amount}
                    {...fieldInputProps}
                    onChange={(ev) =>
                      setForm((f) => ({ ...f, amount: ev.target.value }))
                    }
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Ngày chi
                  </Text>
                  <Input
                    type="date"
                    value={form.expenseDate}
                    {...fieldInputProps}
                    onChange={(ev) =>
                      setForm((f) => ({ ...f, expenseDate: ev.target.value }))
                    }
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Ghi chú (tuỳ chọn)
                  </Text>
                  <Textarea
                    value={form.note}
                    maxLength={2000}
                    rows={3}
                    {...fieldInputProps}
                    onChange={(ev) =>
                      setForm((f) => ({ ...f, note: ev.target.value }))
                    }
                  />
                </Box>
              </Stack>
            </DialogBody>
            <DialogFooter gap={2}>
              <Button
                type="button"
                variant="ghost"
                disabled={formSaving}
                onClick={closeForm}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                colorPalette={APP_COLOR_PALETTE}
                loading={formSaving}
                onClick={submitForm}
              >
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      <DialogRoot
        open={deleteTarget !== null}
        onOpenChange={(e) => {
          if (!e.open) setDeleteTarget(null);
        }}
        lazyMount
        unmountOnExit
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="sm" w="full" mx={4}>
            <DialogHeader>
              <DialogTitle>Xóa chi phí?</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              {deleteTarget ? (
                <Text>
                  Xóa <strong>{deleteTarget.title}</strong> (
                  {vnd.format(deleteTarget.amount)})? Hành động không hoàn tác.
                </Text>
              ) : null}
            </DialogBody>
            <DialogFooter gap={2}>
              <Button
                type="button"
                variant="ghost"
                disabled={deleteSaving}
                onClick={() => setDeleteTarget(null)}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                colorPalette="red"
                loading={deleteSaving}
                onClick={confirmDelete}
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
