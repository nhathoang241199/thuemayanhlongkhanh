"use client";

import {
  Box,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useMemo } from "react";

import type { BookingSlot } from "@/lib/booking-api";
import {
  pickupAllowedDates,
  pickupAllowedHours,
  pickupLocalToParts,
  pickupPartsToLocal,
} from "@/lib/datetime-vn";
import { titleColor, userFieldInputProps } from "@/lib/user-theme";

type PickupTimePickerProps = {
  startDate: string;
  slot: BookingSlot;
  value: string;
  onChange: (local: string) => void;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatHourLabel(hour: number): string {
  return `${pad2(hour)}:00`;
}

export function PickupTimePicker({
  startDate,
  slot,
  value,
  onChange,
}: PickupTimePickerProps) {
  const dateOptions = useMemo(
    () => pickupAllowedDates(startDate, slot),
    [startDate, slot],
  );

  const parsed = useMemo(() => pickupLocalToParts(value), [value]);

  const dateYmd = parsed?.dateYmd ?? dateOptions[0]?.value ?? "";
  const hourOptions = useMemo(
    () => pickupAllowedHours(startDate, slot, dateYmd),
    [startDate, slot, dateYmd],
  );

  const hour =
    parsed?.hour !== undefined && hourOptions.includes(parsed.hour)
      ? parsed.hour
      : (hourOptions[0] ?? 0);

  useEffect(() => {
    if (hourOptions.length === 0) return;
    const parts = pickupLocalToParts(value);
    const valid =
      parts != null &&
      dateOptions.some((d) => d.value === parts.dateYmd) &&
      hourOptions.includes(parts.hour) &&
      parts.minute === 0;
    if (valid) return;
    onChange(
      pickupPartsToLocal({
        dateYmd,
        hour,
        minute: 0,
      }),
    );
  }, [dateYmd, hour, hourOptions, dateOptions, value, onChange]);

  const showDateSelect = dateOptions.length > 1;

  return (
    <Stack gap={3} align="stretch">
      {showDateSelect ? (
        <Box>
          <Text fontSize="sm" fontWeight="medium" color={titleColor} mb={1}>
            Ngày nhận máy
          </Text>
          <NativeSelectRoot size="md">
            <NativeSelectField
              value={dateYmd}
              {...userFieldInputProps}
              onChange={(e) => {
                const nextDate = e.target.value;
                const hours = pickupAllowedHours(startDate, slot, nextDate);
                const nextHour = hours[0] ?? 0;
                onChange(
                  pickupPartsToLocal({
                    dateYmd: nextDate,
                    hour: nextHour,
                    minute: 0,
                  }),
                );
              }}
            >
              {dateOptions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </NativeSelectField>
            <NativeSelectIndicator />
          </NativeSelectRoot>
        </Box>
      ) : null}
      <Box>
        <Text fontSize="sm" fontWeight="medium" color={titleColor} mb={1}>
          Giờ nhận máy
        </Text>
        <NativeSelectRoot size="md">
          <NativeSelectField
            value={String(hour)}
            {...userFieldInputProps}
            onChange={(e) => {
              onChange(
                pickupPartsToLocal({
                  dateYmd,
                  hour: Number(e.target.value),
                  minute: 0,
                }),
              );
            }}
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {formatHourLabel(h)}
              </option>
            ))}
          </NativeSelectField>
          <NativeSelectIndicator />
        </NativeSelectRoot>
      </Box>
    </Stack>
  );
}
