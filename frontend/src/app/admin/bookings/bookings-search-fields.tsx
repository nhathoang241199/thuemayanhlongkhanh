"use client";

import {
  Box,
  HStack,
  IconButton,
  Input,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Stack,
  Text,
} from "@chakra-ui/react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { CloseIcon } from "@/app/admin/bookings/booking-list-icons";
import { APP_COLOR_PALETTE } from "@/lib/app-theme";
import { normalizePhone } from "@/lib/normalize-phone";

export type BookingsSearchField = "phone" | "name" | "bookingCode";

export type BookingsSearchChange = {
  field: BookingsSearchField;
  query: string;
};

const SEARCH_DEBOUNCE_MS = 350;

const searchInputProps = {
  bg: "white" as const,
  borderWidth: "1px" as const,
  borderColor: "gray.200" as const,
  transition: "none" as const,
  _focusVisible: {
    borderColor: "ocean.500",
    boxShadow: "none",
  },
};

type BookingsSearchFieldsProps = {
  showMobilePhone: boolean;
  showDesktop: boolean;
  appliedField: BookingsSearchField;
  appliedQuery: string;
  onDebouncedChange: (value: BookingsSearchChange) => void;
};

function BookingsSearchFieldsInner({
  showMobilePhone,
  showDesktop,
  appliedField,
  appliedQuery,
  onDebouncedChange,
}: BookingsSearchFieldsProps) {
  const [draftField, setDraftField] = useState<BookingsSearchField>(appliedField);
  const [draftQuery, setDraftQuery] = useState(appliedQuery);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDebouncedChangeRef = useRef(onDebouncedChange);
  const lastEmittedRef = useRef<BookingsSearchChange>({
    field: appliedField,
    query: appliedQuery,
  });

  onDebouncedChangeRef.current = onDebouncedChange;

  const isSearchFocused = useCallback(() => {
    const active = document.activeElement;
    return (
      active === mobileInputRef.current || active === desktopInputRef.current
    );
  }, []);

  const emitIfChanged = useCallback((next: BookingsSearchChange) => {
    const prev = lastEmittedRef.current;
    if (prev.field === next.field && prev.query === next.query) {
      return;
    }
    lastEmittedRef.current = next;
    onDebouncedChangeRef.current(next);
  }, []);

  const emitNow = useCallback(
    (field: BookingsSearchField, query: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      emitIfChanged({ field, query });
    },
    [emitIfChanged],
  );

  const scheduleEmit = useCallback(
    (field: BookingsSearchField, query: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        emitIfChanged({ field, query });
      }, SEARCH_DEBOUNCE_MS);
    },
    [emitIfChanged],
  );

  useLayoutEffect(() => {
    if (isSearchFocused()) return;
    setDraftField(appliedField);
    setDraftQuery(appliedQuery);
    lastEmittedRef.current = { field: appliedField, query: appliedQuery };
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [appliedField, appliedQuery, isSearchFocused]);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    },
    [],
  );

  const mobileHasText = draftQuery.trim().length > 0;

  const updateMobileQuery = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, "");
    setDraftField("phone");
    setDraftQuery(digitsOnly);
    scheduleEmit("phone", normalizePhone(digitsOnly));
  };

  const updateDesktopQuery = (query: string) => {
    setDraftQuery(query);
    scheduleEmit(draftField, query);
  };

  const updateDesktopField = (field: BookingsSearchField) => {
    setDraftField(field);
    scheduleEmit(field, draftQuery);
  };

  return (
    <>
      {showMobilePhone ? (
        <Stack display={{ base: "flex", lg: "none" }} gap={2} w="full">
          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
            Số điện thoại
          </Text>
          <Box position="relative" w="full">
            <Input
              ref={mobileInputRef}
              w="full"
              size="sm"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              pe="2.25rem"
              placeholder="Ví dụ: 0901…"
              value={draftQuery}
              aria-label="Tìm theo số điện thoại"
              {...searchInputProps}
              onChange={(e) => updateMobileQuery(e.target.value)}
            />
            <IconButton
              type="button"
              size="xs"
              variant="ghost"
              colorPalette={APP_COLOR_PALETTE}
              position="absolute"
              right={1}
              top="50%"
              transform="translateY(-50%)"
              zIndex={1}
              visibility={mobileHasText ? "visible" : "hidden"}
              pointerEvents={mobileHasText ? "auto" : "none"}
              aria-label="Xóa số điện thoại"
              onClick={() => {
                setDraftField("phone");
                setDraftQuery("");
                emitNow("phone", "");
              }}
            >
              <CloseIcon boxSize="1rem" />
            </IconButton>
          </Box>
        </Stack>
      ) : null}

      {showDesktop ? (
        <Stack
          display={{ base: "none", lg: "flex" }}
          gap={2}
          align="flex-end"
          flex="1"
          minW={{ md: "16rem" }}
          maxW={{ md: "28rem" }}
        >
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="fg.muted"
            textAlign={{ base: "left", md: "right" }}
            w="full"
          >
            Tìm kiếm
          </Text>
          <HStack
            gap={2}
            flexWrap="nowrap"
            align="stretch"
            justify="flex-end"
            w="full"
            maxW="100%"
          >
            <NativeSelectRoot size="sm" w="11rem" flexShrink={0}>
              <NativeSelectField
                value={draftField}
                onChange={(e) =>
                  updateDesktopField(e.target.value as BookingsSearchField)
                }
                {...searchInputProps}
              >
                <option value="bookingCode">Mã đơn</option>
                <option value="name">Tên khách</option>
                <option value="phone">Số điện thoại</option>
              </NativeSelectField>
              <NativeSelectIndicator />
            </NativeSelectRoot>
            <Input
              ref={desktopInputRef}
              flex="1"
              minW={0}
              size="sm"
              placeholder={
                draftField === "phone"
                  ? "Ví dụ: 0901…"
                  : draftField === "name"
                    ? "Nhập tên khách…"
                    : "Ví dụ: DH-20260516-A3F2"
              }
              value={draftQuery}
              aria-label="Từ khóa tìm kiếm"
              {...searchInputProps}
              onChange={(e) => updateDesktopQuery(e.target.value)}
            />
          </HStack>
        </Stack>
      ) : null}
    </>
  );
}

export const BookingsSearchFields = memo(BookingsSearchFieldsInner);
