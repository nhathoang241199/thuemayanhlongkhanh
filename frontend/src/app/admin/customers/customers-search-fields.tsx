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
import { memo, useEffect, useState } from "react";

import { CloseIcon } from "@/app/admin/bookings/booking-list-icons";
import { APP_COLOR_PALETTE } from "@/lib/app-theme";
import { normalizePhone } from "@/lib/normalize-phone";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export type CustomerSearchField = "phone" | "name";

export type CustomerSearchChange = {
  field: CustomerSearchField;
  query: string;
};

type CustomersSearchFieldsProps = {
  appliedField: CustomerSearchField;
  appliedQuery: string;
  onDebouncedChange: (value: CustomerSearchChange) => void;
};

function CustomersSearchFieldsInner({
  appliedField,
  appliedQuery,
  onDebouncedChange,
}: CustomersSearchFieldsProps) {
  const [draftField, setDraftField] =
    useState<CustomerSearchField>(appliedField);
  const [draftQuery, setDraftQuery] = useState(appliedQuery);

  useEffect(() => {
    setDraftField(appliedField);
    setDraftQuery(appliedQuery);
  }, [appliedField, appliedQuery]);

  const debouncedQuery = useDebouncedValue(draftQuery, 300);

  useEffect(() => {
    onDebouncedChange({ field: draftField, query: debouncedQuery });
  }, [debouncedQuery, draftField, onDebouncedChange]);

  const hasText = draftQuery.trim().length > 0;

  return (
    <Stack gap={2} w="full" maxW={{ md: "28rem" }}>
      <Text fontSize="sm" fontWeight="medium" color="fg.muted">
        Tìm kiếm
      </Text>
      <HStack gap={2} flexWrap="nowrap" align="stretch" w="full">
        <NativeSelectRoot size="sm" w="11rem" flexShrink={0}>
          <NativeSelectField
            value={draftField}
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            onChange={(e) =>
              setDraftField(e.target.value as CustomerSearchField)
            }
          >
            <option value="phone">Số điện thoại</option>
            <option value="name">Tên khách</option>
          </NativeSelectField>
          <NativeSelectIndicator />
        </NativeSelectRoot>
        <Box position="relative" flex="1" minW={0}>
          <Input
            w="full"
            size="sm"
            type={draftField === "phone" ? "tel" : "search"}
            inputMode={draftField === "phone" ? "numeric" : "text"}
            autoComplete={draftField === "phone" ? "tel" : "name"}
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            pe={hasText ? "2.25rem" : undefined}
            _focusVisible={{ borderColor: "ocean.500" }}
            placeholder={
              draftField === "phone" ? "Ví dụ: 0901…" : "Nhập tên khách…"
            }
            value={draftQuery}
            onChange={(e) =>
              setDraftQuery(
                draftField === "phone"
                  ? e.target.value.replace(/\D/g, "")
                  : e.target.value,
              )
            }
            aria-label={
              draftField === "phone"
                ? "Tìm theo số điện thoại"
                : "Tìm theo tên khách"
            }
          />
          {hasText ? (
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
              aria-label="Xóa từ khóa"
              onClick={() => setDraftQuery("")}
            >
              <CloseIcon boxSize="1rem" />
            </IconButton>
          ) : null}
        </Box>
      </HStack>
    </Stack>
  );
}

export const CustomersSearchFields = memo(CustomersSearchFieldsInner);
