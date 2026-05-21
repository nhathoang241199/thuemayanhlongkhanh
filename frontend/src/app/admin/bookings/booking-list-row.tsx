"use client";

import { memo } from "react";
import {
  Button,
  HStack,
  IconButton,
  Link,
  Stack,
  TableCell,
  TableRow,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";

import { APP_COLOR_PALETTE } from "@/lib/app-theme";
import { slotLabelVi, slotTimeRangeLabel } from "@/lib/booking-status";

import {
  BookingPaymentMenuCell,
  BookingStatusMenuCell,
} from "./booking-menu-cells";
import { BookingCccdAction } from "./booking-cccd-action";
import { ChevronRightIcon, PencilIcon, TrashIcon } from "./booking-list-icons";
import {
  bookingLocalDateKey,
  formatBookingDate,
  formatPickupAtTable,
  vnd,
} from "./booking-list-utils";
import type { Booking, BookingStatusValue, PaymentStatusValue } from "./booking-types";
import { tableCellPad } from "./booking-types";

export type BookingListRowProps = {
  booking: Booking;
  isRowSaving: boolean;
  quickAdvanceSaving: boolean;
  deleteSaving: boolean;
  canQuickAdvance: boolean;
  onCopyPhone: (phone: string) => void;
  onPaymentChange: (id: string, status: PaymentStatusValue) => void;
  onStatusChange: (id: string, status: BookingStatusValue) => void;
  onMenuOpenChange: () => void;
  onQuickAdvance: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCccdUploaded?: () => void;
};

function BookingListRowInner({
  booking: b,
  isRowSaving,
  quickAdvanceSaving,
  deleteSaving,
  canQuickAdvance,
  onCopyPhone,
  onPaymentChange,
  onStatusChange,
  onMenuOpenChange,
  onQuickAdvance,
  onEdit,
  onDelete,
  onCccdUploaded,
}: BookingListRowProps) {
  return (
    <TableRow>
      <TableCell whiteSpace="nowrap" {...tableCellPad}>
        <Stack gap={0} align="flex-start">
          <Text fontSize="sm">{formatBookingDate(b.startBookingDate)}</Text>
          {bookingLocalDateKey(b.startBookingDate) !==
          bookingLocalDateKey(b.endBookingDate) ? (
            <Text fontSize="sm" color="fg.muted">
              Trả: {formatBookingDate(b.endBookingDate)}
            </Text>
          ) : null}
        </Stack>
      </TableCell>
      <TableCell whiteSpace="nowrap" {...tableCellPad}>
        <Text fontSize="sm">
          {b.pickupAt ? formatPickupAtTable(b.pickupAt) : "—"}
        </Text>
      </TableCell>
      <TableCell {...tableCellPad}>
        <Stack gap={0} align="flex-start">
          <Text fontSize="sm">{slotLabelVi(b.slot)}</Text>
          <Text fontSize="xs" color="fg.muted">
            {slotTimeRangeLabel(b.slot)}
          </Text>
        </Stack>
      </TableCell>
      <TableCell {...tableCellPad}>
        <Stack gap={1} align="flex-start" w="full">
          <Link
            asChild
            fontWeight="medium"
            colorPalette={APP_COLOR_PALETTE}
            _hover={{ textDecoration: "underline" }}
          >
            <NextLink
              href={`/admin/customers/${encodeURIComponent(b.customer.id)}`}
              aria-label={`Chi tiết khách ${b.customer.name}`}
            >
              {b.customer.name}
            </NextLink>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            h="auto"
            minH={0}
            px={1}
            py={0}
            fontSize="sm"
            color="fg.muted"
            fontWeight="normal"
            justifyContent="flex-start"
            title="Nhấn để sao chép số điện thoại"
            _hover={{ textDecoration: "underline" }}
            onClick={() => onCopyPhone(b.customer.phone)}
          >
            {b.customer.phone}
          </Button>
        </Stack>
      </TableCell>
      <TableCell maxW="14rem" {...tableCellPad}>
        {b.shippingAddress?.trim() ? (
          <Text
            fontSize="sm"
            lineClamp={3}
            title={b.shippingAddress.trim()}
            whiteSpace="pre-wrap"
          >
            {b.shippingAddress.trim()}
          </Text>
        ) : (
          <Text fontSize="sm" color="fg.muted">
            Tự lấy
          </Text>
        )}
      </TableCell>
      <TableCell {...tableCellPad}>
        <Text fontSize="sm" color="fg.muted">
          {b.camera.brand}
        </Text>
        <Text fontWeight="medium">{b.camera.name}</Text>
      </TableCell>
      <TableCell {...tableCellPad} textAlign="end">
        <Text fontSize="sm">{vnd.format(b.amount)}</Text>
        {b.paymentStatus === "DEPOSITED" ? (
          <Text fontSize="xs" color="fg.muted">
            Còn lại: {vnd.format(Math.max(0, b.amount - 50_000))}
          </Text>
        ) : null}
      </TableCell>
      <TableCell {...tableCellPad}>
        <BookingPaymentMenuCell
          booking={b}
          saving={isRowSaving}
          onChangePaymentStatus={onPaymentChange}
          onMenuOpenChange={onMenuOpenChange}
        />
      </TableCell>
      <TableCell {...tableCellPad}>
        <BookingStatusMenuCell
          booking={b}
          saving={isRowSaving}
          onChangeStatus={onStatusChange}
          onMenuOpenChange={onMenuOpenChange}
        />
      </TableCell>
      <TableCell maxW="12rem" {...tableCellPad}>
        {b.note ? (
          <Text lineClamp={3} title={b.note} whiteSpace="pre-wrap">
            {b.note}
          </Text>
        ) : (
          <Text color="fg.muted">—</Text>
        )}
      </TableCell>
      <TableCell {...tableCellPad}>
        <HStack gap={1} justify="flex-end">
          <BookingCccdAction
            status={b.status}
            customerId={b.customer.id}
            customerName={b.customer.name}
            verificationImageUrls={b.customer.verificationImageUrls ?? []}
            disabled={isRowSaving}
            size="sm"
            onCccdUploaded={onCccdUploaded}
          />
          {canQuickAdvance ? (
            <IconButton
              type="button"
              size="sm"
              variant="subtle"
              colorPalette="green"
              aria-label="Chuyển tiếp trạng thái"
              disabled={isRowSaving}
              loading={quickAdvanceSaving}
              onClick={onQuickAdvance}
            >
              <ChevronRightIcon />
            </IconButton>
          ) : null}
          <IconButton
            type="button"
            size="sm"
            variant="subtle"
            colorPalette="blue"
            aria-label={`Sửa đơn ${b.bookingCode}`}
            disabled={isRowSaving}
            onClick={onEdit}
          >
            <PencilIcon />
          </IconButton>
          <IconButton
            type="button"
            size="sm"
            variant="subtle"
            colorPalette="red"
            aria-label={`Xóa đơn ${b.bookingCode}`}
            loading={deleteSaving}
            disabled={isRowSaving}
            onClick={onDelete}
          >
            <TrashIcon />
          </IconButton>
        </HStack>
      </TableCell>
    </TableRow>
  );
}

export const BookingListRow = memo(BookingListRowInner);
