"use client";

import {
  Box,
  HStack,
  IconButton,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Stack,
  TableBody,
  TableColumnHeader,
  TableHeader,
  TableRoot,
  TableRow,
  TableScrollArea,
  Text,
} from "@chakra-ui/react";
import { memo, type ReactNode } from "react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/app/admin/bookings/booking-list-icons";
import { tableCellPad } from "@/app/admin/bookings/booking-types";
import { AdminResponsiveTable } from "@/components/admin/admin-responsive-table";
import { APP_COLOR_PALETTE } from "@/lib/app-theme";

export type BookingsListPanelProps = {
  isEmpty: boolean;
  emptyMessage: string;
  patchError: string | null;
  tableRows: ReactNode;
  cards: ReactNode | null;
  clampedPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageSizeChange: (size: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
};

function BookingsListPanelInner({
  isEmpty,
  emptyMessage,
  patchError,
  tableRows,
  cards,
  clampedPage,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
}: BookingsListPanelProps) {
  if (isEmpty) {
    return (
      <Box px={4} py={8}>
        <Text color="fg.muted" textAlign="center">
          {emptyMessage}
        </Text>
      </Box>
    );
  }

  return (
    <Stack gap={3}>
      {patchError ? (
        <Box px={4} pt={2}>
          <Text color="red.fg" fontSize="sm" fontWeight="medium">
            {patchError}
          </Text>
        </Box>
      ) : null}
      <AdminResponsiveTable
        breakpoint="lg"
        table={
          <TableScrollArea rounded="l2">
            <TableRoot size="sm" native>
              <TableHeader>
                <TableRow>
                  <TableColumnHeader
                    w="2.75rem"
                    textAlign="center"
                    {...tableCellPad}
                  >
                    STT
                  </TableColumnHeader>
                  <TableColumnHeader {...tableCellPad}>
                    Ngày thuê
                  </TableColumnHeader>
                  <TableColumnHeader {...tableCellPad}>
                    Nhận máy
                  </TableColumnHeader>
                  <TableColumnHeader {...tableCellPad}>Buổi</TableColumnHeader>
                  <TableColumnHeader {...tableCellPad}>Khách</TableColumnHeader>
                  <TableColumnHeader {...tableCellPad}>Máy</TableColumnHeader>
                  <TableColumnHeader {...tableCellPad}>Ship</TableColumnHeader>
                  <TableColumnHeader {...tableCellPad} textAlign="end">
                    Số tiền
                  </TableColumnHeader>
                  <TableColumnHeader {...tableCellPad}>
                    Thanh toán
                  </TableColumnHeader>
                  <TableColumnHeader {...tableCellPad}>
                    Trạng thái
                  </TableColumnHeader>
                  <TableColumnHeader maxW="12rem" {...tableCellPad}>
                    Ghi chú
                  </TableColumnHeader>
                  <TableColumnHeader {...tableCellPad} w="7.5rem">
                    Hành động
                  </TableColumnHeader>
                </TableRow>
              </TableHeader>
              <TableBody>{tableRows}</TableBody>
            </TableRoot>
          </TableScrollArea>
        }
        cards={cards}
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
              aria-label="Số đơn mỗi trang"
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((n) => (
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
            disabled={clampedPage <= 1}
            onClick={onPrevPage}
          >
            <ChevronLeftIcon boxSize="1.25rem" />
          </IconButton>
          <IconButton
            type="button"
            size="md"
            variant="outline"
            colorPalette={APP_COLOR_PALETTE}
            aria-label="Trang sau"
            disabled={clampedPage >= totalPages}
            onClick={onNextPage}
          >
            <ChevronRightIcon boxSize="1.25rem" />
          </IconButton>
        </HStack>
      </HStack>
    </Stack>
  );
}

export const BookingsListPanel = memo(BookingsListPanelInner);
