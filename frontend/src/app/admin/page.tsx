"use client";

import {
  Box,
  Button,
  CardBody,
  CardDescription,
  CardHeader,
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
  SimpleGrid,
  Stack,
  StatHelpText,
  StatLabel,
  StatRoot,
  StatValueText,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  dateInPeriod,
  defaultExpenseDateInput,
  expenseDateToIso,
  parseDateInput,
} from "@/lib/expense-date";
import {
  APP_COLOR_PALETTE,
  accentColor,
  cardSurfaceProps,
  fieldInputProps,
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

type MonthlySummary = {
  year: number;
  month: number;
  revenue: number;
  expenses: number;
  profit: number;
  bookingCount: number;
  expenseCount: number;
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

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

function makeEmptyExpenseForm(
  periodYear: number,
  periodMonth: number,
): ExpenseForm {
  return {
    title: "",
    amount: "",
    expenseDate: defaultExpenseDateInput(periodYear, periodMonth),
    note: "",
  };
}

export default function AdminPage() {
  const now = useMemo(() => new Date(), []);
  const defaultYear = now.getUTCFullYear();
  const defaultMonth = now.getUTCMonth() + 1;

  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<MonthlySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(() =>
    makeEmptyExpenseForm(defaultYear, defaultMonth),
  );
  const [expenseModalError, setExpenseModalError] = useState<string | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = YEAR_MIN; y <= YEAR_MAX; y++) list.push(y);
    return list;
  }, []);

  const fetchSummary = useCallback(
    async (y: number, m: number, signal?: AbortSignal) => {
      const res = await fetch(
        `${apiBase()}/api/stats/monthly-summary?year=${y}&month=${m}`,
        { credentials: "include", signal },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return (await res.json()) as MonthlySummary;
    },
    [],
  );

  const refreshSummary = useCallback(async () => {
    setError(null);
    try {
      const json = await fetchSummary(year, month);
      setData(json);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    }
  }, [fetchSummary, year, month]);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      setError(null);
      try {
        const json = await fetchSummary(year, month, ac.signal);
        if (!ac.signal.aborted) setData(json);
      } catch (e) {
        if (ac.signal.aborted) return;
        setData(null);
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      }
    })();
    return () => ac.abort();
  }, [year, month, fetchSummary]);

  const closeExpenseModal = () => {
    setExpenseModalOpen(false);
    setExpenseModalError(null);
    setExpenseForm(makeEmptyExpenseForm(year, month));
  };

  const openExpenseModal = () => {
    setExpenseForm(makeEmptyExpenseForm(year, month));
    setExpenseModalError(null);
    setExpenseModalOpen(true);
  };

  const submitExpense = () => {
    const title = expenseForm.title.trim();
    if (!title) {
      setExpenseModalError("Tiêu đề không được để trống.");
      return;
    }
    const amount = Number.parseInt(expenseForm.amount.replace(/\D/g, ""), 10);
    if (!Number.isFinite(amount) || amount < 0) {
      setExpenseModalError("Số tiền phải là số nguyên không âm.");
      return;
    }
    const noteTrim = expenseForm.note.trim();
    const dateParts = parseDateInput(expenseForm.expenseDate);
    if (!dateParts) {
      setExpenseModalError("Ngày chi không hợp lệ.");
      return;
    }
    if (!dateInPeriod(dateParts, year, month)) {
      setExpenseModalError(
        `Ngày chi phải thuộc ${MONTH_LABELS_VI[month - 1]} ${year} (UTC).`,
      );
      return;
    }

    void (async () => {
      setExpenseSaving(true);
      setExpenseModalError(null);
      try {
        const body: {
          title: string;
          amount: number;
          expenseDate: string;
          note?: string;
        } = {
          title,
          amount,
          expenseDate: expenseDateToIso(dateParts),
        };
        if (noteTrim) body.note = noteTrim;

        const res = await fetch(`${apiBase()}/api/expenses`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }

        closeExpenseModal();
        toaster.success({ title: "Đã thêm chi phí" });
        await refreshSummary();
      } catch (e) {
        setExpenseModalError(
          e instanceof Error ? e.message : "Không thêm được chi phí.",
        );
      } finally {
        setExpenseSaving(false);
      }
    })();
  };

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardHeader>
          <CardTitle textStyle="2xl">Admin</CardTitle>
        </CardHeader>
        <CardBody>
          <Text>
            Doanh thu (booking{" "}
            <Text as="span" fontWeight="semibold">
              PAID
            </Text>{" "}
            theo{" "}
            <Text as="span" fontWeight="semibold">
              startBookingDate
            </Text>
            ), chi phí theo{" "}
            <Text as="span" fontWeight="semibold">
              expenseDate
            </Text>{" "}
            —{" "}
            <Text as="span" fontWeight="semibold">
              UTC
            </Text>
            . Mặc định: tháng và năm hiện tại.
          </Text>
        </CardBody>
      </CardRoot>

      <CardRoot {...cardSurfaceProps}>
        <CardHeader pb={0}>
          <HStack justify="space-between" align="flex-start" gap={4} flexWrap="wrap">
            <Box>
              <CardTitle textStyle="lg">Chọn kỳ</CardTitle>
              <CardDescription>Tháng và năm để xem số liệu</CardDescription>
            </Box>
            <Button
              type="button"
              size="sm"
              colorPalette={APP_COLOR_PALETTE}
              onClick={openExpenseModal}
            >
              Thêm chi phí
            </Button>
          </HStack>
        </CardHeader>
        <CardBody pt={4}>
          <HStack gap={4} flexWrap="wrap" align="flex-end">
            <Box minW={{ md: "12rem" }} w={{ base: "full", md: "auto" }}>
              <Text fontSize="sm" mb={1} fontWeight="medium">
                Tháng
              </Text>
              <NativeSelectRoot size="md">
                <NativeSelectField
                  value={String(month)}
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.200"
                  _focusVisible={{
                    borderColor: "ocean.500",
                  }}
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
              <NativeSelectRoot size="md">
                <NativeSelectField
                  value={String(year)}
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.200"
                  _focusVisible={{
                    borderColor: "ocean.500",
                  }}
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

      {data ? (
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
          <CardRoot {...cardSurfaceProps}>
            <CardBody>
              <StatRoot size="lg">
                <StatLabel>Doanh thu</StatLabel>
                <StatValueText color={accentColor}>
                  {vnd.format(data.revenue)}
                </StatValueText>
                <StatHelpText>{data.bookingCount} booking PAID</StatHelpText>
              </StatRoot>
            </CardBody>
          </CardRoot>
          <CardRoot {...cardSurfaceProps}>
            <CardBody>
              <StatRoot size="lg">
                <StatLabel>Chi phí</StatLabel>
                <StatValueText color="red.600">
                  {vnd.format(data.expenses)}
                </StatValueText>
                <StatHelpText>{data.expenseCount} khoản chi</StatHelpText>
              </StatRoot>
            </CardBody>
          </CardRoot>
          <CardRoot {...cardSurfaceProps}>
            <CardBody>
              <StatRoot size="lg">
                <StatLabel>Lợi nhuận</StatLabel>
                <StatValueText color="green.600">
                  {vnd.format(data.profit)}
                </StatValueText>
                <StatHelpText>
                  {MONTH_LABELS_VI[data.month - 1]} {data.year}
                </StatHelpText>
              </StatRoot>
            </CardBody>
          </CardRoot>
        </SimpleGrid>
      ) : null}

      <DialogRoot
        open={expenseModalOpen}
        onOpenChange={(e) => {
          if (!e.open) closeExpenseModal();
        }}
        lazyMount
        unmountOnExit
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="md" w="full" mx={4}>
            <DialogHeader>
              <DialogTitle>Thêm chi phí</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <Stack gap={4}>
                {expenseModalError ? (
                  <Text color="red.fg" fontSize="sm" fontWeight="medium">
                    {expenseModalError}
                  </Text>
                ) : null}
                <Text fontSize="sm" color="fg.muted">
                  Ghi vào {MONTH_LABELS_VI[month - 1]} {year} (UTC)
                </Text>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Tiêu đề
                  </Text>
                  <Input
                    value={expenseForm.title}
                    maxLength={255}
                    placeholder="Ví dụ: Mua thẻ nhớ"
                    {...fieldInputProps}
                    onChange={(e) =>
                      setExpenseForm((f) => ({ ...f, title: e.target.value }))
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
                    value={expenseForm.amount}
                    placeholder="500000"
                    {...fieldInputProps}
                    onChange={(e) =>
                      setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                    }
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Ngày chi
                  </Text>
                  <Input
                    type="date"
                    value={expenseForm.expenseDate}
                    {...fieldInputProps}
                    onChange={(e) =>
                      setExpenseForm((f) => ({
                        ...f,
                        expenseDate: e.target.value,
                      }))
                    }
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Ghi chú (tuỳ chọn)
                  </Text>
                  <Textarea
                    value={expenseForm.note}
                    maxLength={2000}
                    rows={3}
                    placeholder="Mô tả thêm…"
                    {...fieldInputProps}
                    onChange={(e) =>
                      setExpenseForm((f) => ({ ...f, note: e.target.value }))
                    }
                  />
                </Box>
              </Stack>
            </DialogBody>
            <DialogFooter gap={2}>
              <Button
                type="button"
                variant="ghost"
                disabled={expenseSaving}
                onClick={closeExpenseModal}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                colorPalette={APP_COLOR_PALETTE}
                loading={expenseSaving}
                onClick={submitExpense}
              >
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Stack>
  );
}
