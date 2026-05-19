"use client";

import {
  Button,
  HStack,
  IconButton,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";

import {
  AdminDataCard,
  AdminDataCardActions,
  AdminDataCardHeader,
  AdminDataCardRow,
} from "@/components/admin/admin-data-card";
import { APP_COLOR_PALETTE } from "@/lib/app-theme";
import { slotLabelVi, slotTimeRangeLabel } from "@/lib/booking-status";

import {
  BookingPaymentMenuCell,
  BookingStatusMenuCell,
} from "./booking-menu-cells";
import { ChevronRightIcon, PencilIcon, TrashIcon } from "./booking-list-icons";
import type { BookingListRowProps } from "./booking-list-row";
import {
  bookingLocalDateKey,
  formatBookingDate,
  formatPickupAtTable,
  vnd,
} from "./booking-list-utils";

export function BookingListCard({
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
}: BookingListRowProps) {
  const dateLabel =
    bookingLocalDateKey(b.startBookingDate) !==
    bookingLocalDateKey(b.endBookingDate)
      ? `${formatBookingDate(b.startBookingDate)} → ${formatBookingDate(b.endBookingDate)}`
      : formatBookingDate(b.startBookingDate);

  return (
    <AdminDataCard>
      <AdminDataCardHeader>
        <Stack gap={1} align="stretch">
          <HStack justify="space-between" align="flex-start" gap={2}>
            <Text fontWeight="semibold" fontSize="sm">
              {b.bookingCode}
            </Text>
            <HStack gap={1} flexWrap="wrap" justify="flex-end">
              <BookingPaymentMenuCell
                booking={b}
                saving={isRowSaving}
                onChangePaymentStatus={onPaymentChange}
                onMenuOpenChange={onMenuOpenChange}
              />
              <BookingStatusMenuCell
                booking={b}
                saving={isRowSaving}
                onChangeStatus={onStatusChange}
                onMenuOpenChange={onMenuOpenChange}
              />
            </HStack>
          </HStack>
          <Link
            asChild
            fontWeight="medium"
            colorPalette={APP_COLOR_PALETTE}
            fontSize="sm"
          >
            <NextLink href={`/admin/customers/${encodeURIComponent(b.customer.id)}`}>
              {b.customer.name}
            </NextLink>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            h="auto"
            minH={0}
            px={0}
            py={0}
            fontSize="sm"
            color="fg.muted"
            fontWeight="normal"
            justifyContent="flex-start"
            onClick={() => onCopyPhone(b.customer.phone)}
          >
            {b.customer.phone}
          </Button>
        </Stack>
      </AdminDataCardHeader>
      <AdminDataCardRow label="Ngày thuê">{dateLabel}</AdminDataCardRow>
      <AdminDataCardRow label="Nhận máy">
        {b.pickupAt ? formatPickupAtTable(b.pickupAt) : "—"}
      </AdminDataCardRow>
      <AdminDataCardRow label="Buổi">
        <Stack gap={0}>
          <Text>{slotLabelVi(b.slot)}</Text>
          <Text fontSize="xs" color="fg.muted">
            {slotTimeRangeLabel(b.slot)}
          </Text>
        </Stack>
      </AdminDataCardRow>
      <AdminDataCardRow label="Máy">
        <Stack gap={0}>
          <Text color="fg.muted" fontSize="xs">
            {b.camera.brand}
          </Text>
          <Text fontWeight="medium">{b.camera.name}</Text>
        </Stack>
      </AdminDataCardRow>
      <AdminDataCardRow label="Địa chỉ">
        {b.shippingAddress?.trim() ? (
          <Text whiteSpace="pre-wrap">{b.shippingAddress.trim()}</Text>
        ) : (
          <Text color="fg.muted">Tự lấy</Text>
        )}
      </AdminDataCardRow>
      <AdminDataCardRow label="Số tiền">
        <Stack gap={0}>
          <Text fontWeight="semibold">{vnd.format(b.amount)}</Text>
          {b.paymentStatus === "DEPOSITED" ? (
            <Text fontSize="xs" color="fg.muted">
              Còn lại: {vnd.format(Math.max(0, b.amount - 50_000))}
            </Text>
          ) : null}
        </Stack>
      </AdminDataCardRow>
      {b.note ? (
        <AdminDataCardRow label="Ghi chú">
          <Text whiteSpace="pre-wrap">{b.note}</Text>
        </AdminDataCardRow>
      ) : null}
      <AdminDataCardActions>
        <IconButton
          type="button"
          size="sm"
          variant="subtle"
          colorPalette="green"
          aria-label="Chuyển tiếp trạng thái"
          disabled={isRowSaving || !canQuickAdvance}
          loading={quickAdvanceSaving}
          onClick={onQuickAdvance}
        >
          <ChevronRightIcon />
        </IconButton>
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
      </AdminDataCardActions>
    </AdminDataCard>
  );
}
