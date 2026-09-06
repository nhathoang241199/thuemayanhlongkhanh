"use client";

import { Badge, Stack, Text } from "@chakra-ui/react";

import type { ShipOrder } from "@/lib/api";

type AdminBookingShipCellProps = {
  orders?: ShipOrder[];
};

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Chờ shipper";
    case "CLAIMED":
      return "Đang giao";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

export function AdminBookingShipCell({ orders }: AdminBookingShipCellProps) {
  const outbound = orders?.find((order) => order.leg === "OUTBOUND");

  if (!outbound) {
    return <Text color="fg.muted">—</Text>;
  }

  return (
    <Stack gap={1} align="flex-start">
      <Badge size="sm" variant="subtle">
        {statusLabel(outbound.status)}
      </Badge>
      <Text fontSize="sm" color={outbound.shipper?.name ? undefined : "fg.muted"}>
        {outbound.shipper?.name ?? "Chưa có shipper"}
      </Text>
    </Stack>
  );
}
