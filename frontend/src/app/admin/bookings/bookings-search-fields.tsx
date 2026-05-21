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
import { memo, useEffect, useRef, useState } from "react";

import { CloseIcon } from "@/app/admin/bookings/booking-list-icons";
import { APP_COLOR_PALETTE } from "@/lib/app-theme";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export type BookingsSearchField = "phone" | "name" | "bookingCode";

export type BookingsSearchChange = {
  field: BookingsSearchField;
  query: string;
};

function normalizePhoneDigits(s: string): string {
  return s.replace(/\D/g, "");
}

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
  const debouncedQuery = useDebouncedValue(draftQuery, 300);
  const lastEmittedRef = useRef<BookingsSearchChange>({
    field: appliedField,
    query: appliedQuery,
  });

  useEffect(() => {
    setDraftField(appliedField);
    setDraftQuery(appliedQuery);
    lastEmittedRef.current = { field: appliedField, query: appliedQuery };
  }, [appliedField, appliedQuery]);

  useEffect(() => {
    const next: BookingsSearchChange = {
      field: draftField,
      query: debouncedQuery,
    };
    const prev = lastEmittedRef.current;
    if (prev.field === next.field && prev.query === next.query) {
      return;
    }
    lastEmittedRef.current = next;
    onDebouncedChange(next);
  }, [draftField, debouncedQuery, onDebouncedChange]);

  const mobileHasText = draftQuery.trim().length > 0;

  return (
    <>
      {showMobilePhone ? (
        <Stack display={{ base: "flex", lg: "none" }} gap={2} w="full">
          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
            Số điện thoại
          </Text>
          <Box position="relative" w="full">
            <Input
              w="full"
              size="sm"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              pe={mobileHasText ? "2.25rem" : undefined}
              _focusVisible={{ borderColor: "ocean.500" }}
              placeholder="Ví dụ: 0901…"
              value={draftQuery}
              onChange={(e) => {
                setDraftField("phone");
                setDraftQuery(normalizePhoneDigits(e.target.value));
              }}
              aria-label="Tìm theo số điện thoại"
            />
            {mobileHasText ? (
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
                aria-label="Xóa số điện thoại"
                onClick={() => {
                  setDraftField("phone");
                  setDraftQuery("");
                }}
              >
                <CloseIcon boxSize="1rem" />
              </IconButton>
            ) : null}
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
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                onChange={(e) =>
                  setDraftField(e.target.value as BookingsSearchField)
                }
              >
                <option value="bookingCode">Mã đơn</option>
                <option value="name">Tên khách</option>
                <option value="phone">Số điện thoại</option>
              </NativeSelectField>
              <NativeSelectIndicator />
            </NativeSelectRoot>
            <Input
              flex="1"
              minW={0}
              size="sm"
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              _focusVisible={{
                borderColor: "ocean.500",
              }}
              placeholder={
                draftField === "phone"
                  ? "Ví dụ: 0901…"
                  : draftField === "name"
                    ? "Nhập tên khách…"
                    : "Ví dụ: DH-20260516-A3F2"
              }
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              aria-label="Từ khóa tìm kiếm"
            />
          </HStack>
        </Stack>
      ) : null}
    </>
  );
}

export const BookingsSearchFields = memo(BookingsSearchFieldsInner);
