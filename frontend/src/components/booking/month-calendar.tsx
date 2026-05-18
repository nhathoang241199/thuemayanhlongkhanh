"use client";

import { Box, Button, Grid, HStack, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";

import { formatDateVi, type CalendarDay } from "@/lib/booking-api";
import { titleColor, userOutlineButtonProps } from "@/lib/user-theme";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function todayStr(): string {
  const t = new Date();
  const vn = new Date(t.getTime() + 7 * 60 * 60 * 1000);
  return `${vn.getUTCFullYear()}-${pad(vn.getUTCMonth() + 1)}-${pad(vn.getUTCDate())}`;
}

type Props = {
  year: number;
  month: number;
  days?: CalendarDay[];
  startDate: string | null;
  endDate: string | null;
  onRangeChange: (start: string, end: string) => void;
  allowUnavailableDays?: boolean;
};

export function MonthCalendar({
  year,
  month,
  days,
  startDate,
  endDate,
  onRangeChange,
  allowUnavailableDays = false,
}: Props) {
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);
  const [pickStart, setPickStart] = useState<string | null>(startDate);

  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarDay>();
    days?.forEach((d) => m.set(d.date, d));
    return m;
  }, [days]);

  const cells = useMemo(() => {
    const firstDow = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
    const result: (string | null)[] = [];
    for (let i = 0; i < offset; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(
        `${viewYear}-${pad(viewMonth)}-${pad(d)}`,
      );
    }
    return result;
  }, [viewYear, viewMonth]);

  const today = todayStr();

  function inRange(date: string): boolean {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  }

  function handleDayClick(date: string) {
    const info = dayMap.get(date);
    if (!allowUnavailableDays && info && !info.available) return;
    if (date < today) return;

    if (!pickStart) {
      setPickStart(date);
      onRangeChange(date, date);
      return;
    }

    let s = pickStart;
    let e = date;
    if (e < s) [s, e] = [e, s];
    setPickStart(null);
    onRangeChange(s, e);
  }

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else setViewMonth((m) => m + 1);
  }

  return (
    <Box>
      <HStack justify="space-between" mb={3}>
        <Button size="sm" {...userOutlineButtonProps} onClick={prevMonth}>
          ‹
        </Button>
        <Text fontWeight="semibold" color={titleColor}>
          Tháng {viewMonth}/{viewYear}
        </Text>
        <Button size="sm" {...userOutlineButtonProps} onClick={nextMonth}>
          ›
        </Button>
      </HStack>
      <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={1}>
        {WEEKDAYS.map((w) => (
          <Text key={w} fontSize="xs" textAlign="center" color="fg.muted">
            {w}
          </Text>
        ))}
      </Grid>
      <Grid templateColumns="repeat(7, 1fr)" gap={1}>
        {cells.map((date, i) => {
          if (!date) return <Box key={`e-${i}`} />;
          const info = dayMap.get(date);
          const disabled =
            date < today ||
            (!allowUnavailableDays && info !== undefined && !info.available);
          const selected = inRange(date);
          const isEdge =
            date === startDate || date === endDate;
          return (
            <Button
              key={date}
              size="sm"
              variant={selected ? "solid" : "ghost"}
              colorPalette={selected ? "cerulean" : undefined}
              opacity={disabled ? 0.35 : 1}
              fontWeight={isEdge ? "bold" : "normal"}
              onClick={() => !disabled && handleDayClick(date)}
              disabled={disabled}
              h="9"
              minW="0"
              px={0}
            >
              {Number(date.slice(8, 10))}
            </Button>
          );
        })}
      </Grid>
      {startDate && endDate ? (
        <Text fontSize="sm" color="fg.muted" mt={2} textAlign="center">
          {startDate === endDate
            ? formatDateVi(startDate)
            : `${formatDateVi(startDate)} → ${formatDateVi(endDate)}`}
        </Text>
      ) : pickStart ? (
        <Text fontSize="sm" color="fg.muted" mt={2} textAlign="center">
          Chọn ngày kết thúc
        </Text>
      ) : null}
    </Box>
  );
}

export { addDays, todayStr };
