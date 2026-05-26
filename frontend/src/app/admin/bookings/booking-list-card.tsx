"use client";

import {
  Badge,
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  HStack,
  IconButton,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { memo, useState } from "react";

import {
  AdminDataCard,
  AdminDataCardActions,
  AdminDataCardHeader,
} from "@/components/admin/admin-data-card";
import { APP_COLOR_PALETTE, titleColor } from "@/lib/app-theme";
import { balanceDueVnd } from "@/lib/booking-payment";
import { slotLabelVi } from "@/lib/booking-status";

import { BookingCccdAction } from "./booking-cccd-action";
import { BookingStatusMenuCell } from "./booking-menu-cells";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  NoteIcon,
} from "./booking-list-icons";
import type { BookingListRowProps } from "./booking-list-row";
import {
  bookingVnDateKey,
  formatBookingDateRelative,
  formatPickupAtMobileCard,
  paymentBadgeProps,
  vnd,
} from "./booking-list-utils";

export type BookingListCardProps = BookingListRowProps;

function BookingListCardInner({
  booking: b,
  isRowSaving,
  quickAdvanceSaving,
  canQuickAdvance,
  canQuickRevert,
  onCopyPhone,
  onStatusChange,
  onMenuOpenChange,
  onQuickAdvance,
  onQuickRevert,
  onCccdUploaded,
}: BookingListCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const noteText = b.note?.trim() ?? "";

  const dateLabel =
    bookingVnDateKey(b.startBookingDate) !== bookingVnDateKey(b.endBookingDate)
      ? `${formatBookingDateRelative(b.startBookingDate)} → ${formatBookingDateRelative(b.endBookingDate)}`
      : formatBookingDateRelative(b.startBookingDate);

  const usageDetail = `${slotLabelVi(b.slot)} ${dateLabel}`.toLocaleLowerCase(
    "vi-VN",
  );

  const pay = paymentBadgeProps(b.paymentStatus);
  const bookingSettled =
    b.status === "COMPLETED" || b.status === "CANCELLED";
  const showTotal = b.paymentStatus === "PENDING";
  /** Mobile: còn lại chỉ khi đã cọc, chưa thanh toán đủ, đơn chưa kết thúc. */
  const showBalanceDue =
    !bookingSettled && b.paymentStatus === "DEPOSITED";
  const verificationUrls = b.customer.verificationImageUrls ?? [];

  return (
    <AdminDataCard>
      <AdminDataCardHeader>
        <HStack justify="space-between" align="flex-start" gap={2}>
          <Stack gap={1} align="stretch" flex="1" minW={0} py={1}>
            <Link
              asChild
              fontWeight="medium"
              colorPalette={APP_COLOR_PALETTE}
              fontSize="sm"
            >
              <NextLink
                href={`/admin/customers/${encodeURIComponent(b.customer.id)}`}
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
          <Stack gap={1} flexShrink={0} alignItems="flex-end" ml="auto">
            <Box alignSelf="flex-end">
              <BookingStatusMenuCell
                booking={b}
                saving={isRowSaving}
                size="prominent"
                onChangeStatus={onStatusChange}
                onMenuOpenChange={onMenuOpenChange}
              />
            </Box>
            <Badge
              variant="subtle"
              colorPalette={pay.colorPalette}
              fontSize="sm"
              alignSelf="flex-end"
            >
              {pay.label}
            </Badge>
          </Stack>
        </HStack>
      </AdminDataCardHeader>

      <Stack gap={1} pt={1} pb={1} w="full">
        <HStack justify="space-between" align="center" gap={3} w="full">
          <Text
            fontSize="3xl"
            fontWeight="bold"
            lineHeight="short"
            flex="1"
            minW={0}
          >
            {b.camera.name}
          </Text>
          {showTotal ? (
            <Text
              fontSize="xl"
              fontWeight="bold"
              lineHeight="short"
              textAlign="right"
              flexShrink={0}
            >
              {vnd.format(b.amount)}
            </Text>
          ) : showBalanceDue ? (
            <Text
              fontSize="xl"
              fontWeight="bold"
              lineHeight="short"
              textAlign="right"
              flexShrink={0}
            >
              {vnd.format(balanceDueVnd(b.amount))}
            </Text>
          ) : null}
        </HStack>
        <Stack gap={1} fontSize="sm" w="full">
          <HStack gap={1.5} align="baseline" minW={0}>
            <Text
              color="fg.muted"
              flexShrink={0}
              lineHeight="short"
              fontWeight="medium"
            >
              Sử dụng:
            </Text>
            <Text color="fg.muted" lineHeight="short" minW={0} fontWeight="normal">
              {usageDetail}
              {b.returnNextMorning ? " · Trả sáng hôm sau" : ""}
            </Text>
          </HStack>
          <HStack gap={1.5} align="baseline" minW={0}>
            <Text
              color="fg.muted"
              flexShrink={0}
              lineHeight="short"
              fontWeight="medium"
            >
              Nhận máy:
            </Text>
            <Text color="fg.muted" lineHeight="short" minW={0} fontWeight="normal">
              {b.pickupAt ? formatPickupAtMobileCard(b.pickupAt) : "—"}
            </Text>
          </HStack>
        </Stack>
      </Stack>

      <AdminDataCardActions justify="space-between">
        <HStack gap={1}>
          <BookingCccdAction
            customerId={b.customer.id}
            customerName={b.customer.name}
            verificationImageUrls={verificationUrls}
            disabled={isRowSaving}
            size="lg"
            onCccdUploaded={onCccdUploaded}
          />
          {noteText ? (
            <IconButton
              type="button"
              size="lg"
              variant="subtle"
              colorPalette={APP_COLOR_PALETTE}
              aria-label="Xem ghi chú"
              onClick={() => setNoteOpen(true)}
            >
              <NoteIcon boxSize="1.25rem" />
            </IconButton>
          ) : null}
        </HStack>
        <HStack gap={1}>
          {canQuickRevert ? (
            <IconButton
              type="button"
              size="lg"
              variant="subtle"
              colorPalette="orange"
              aria-label="Chuyển về đang thuê"
              disabled={isRowSaving}
              loading={quickAdvanceSaving}
              onClick={onQuickRevert}
            >
              <ChevronLeftIcon boxSize="1.35rem" />
            </IconButton>
          ) : null}
          {canQuickAdvance ? (
            <IconButton
              type="button"
              size="lg"
              variant="subtle"
              colorPalette="green"
              aria-label="Chuyển tiếp trạng thái"
              disabled={isRowSaving}
              loading={quickAdvanceSaving}
              onClick={onQuickAdvance}
            >
              <ChevronRightIcon boxSize="1.35rem" />
            </IconButton>
          ) : null}
        </HStack>
      </AdminDataCardActions>

      {noteText ? (
        <DialogRoot
          open={noteOpen}
          onOpenChange={(e) => setNoteOpen(e.open)}
          lazyMount
          unmountOnExit
        >
          <DialogBackdrop />
          <DialogPositioner>
            <DialogContent maxW="md" mx={4}>
              <DialogHeader>
                <DialogTitle color={titleColor}>Ghi chú</DialogTitle>
                <DialogCloseTrigger />
              </DialogHeader>
              <DialogBody pb={6}>
                <Text whiteSpace="pre-wrap" fontSize="sm">
                  {noteText}
                </Text>
              </DialogBody>
            </DialogContent>
          </DialogPositioner>
        </DialogRoot>
      ) : null}
    </AdminDataCard>
  );
}

export const BookingListCard = memo(BookingListCardInner);
