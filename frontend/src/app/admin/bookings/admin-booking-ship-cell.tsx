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

function selectCurrentShipOrder(orders?: ShipOrder[]): ShipOrder | undefined {
  if (!orders?.length) return undefined;

  const active = orders
    .filter((order) => order.status === "CLAIMED" || order.status === "PENDING")
    .sort((a, b) => {
      const statusRank = (status: string) => (status === "CLAIMED" ? 2 : 1);
      return (
        statusRank(b.status) - statusRank(a.status) ||
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
    });

  return active[0] ?? orders.find((order) => order.leg === "OUTBOUND") ?? orders[0];
}

export function AdminBookingShipCell({ orders }: AdminBookingShipCellProps) {
  const currentOrder = selectCurrentShipOrder(orders);

  if (!currentOrder) {
    return <Text color="fg.muted">—</Text>;
  }

  return (
    <Stack gap={1} align="flex-start">
      <Badge size="sm" variant="subtle">
        {statusLabel(currentOrder.status)}
      </Badge>
      <Text
        fontSize="sm"
        color={currentOrder.shipper?.name ? undefined : "fg.muted"}
      >
        {currentOrder.shipper?.name ?? "Chưa có shipper"}
      </Text>
    </Stack>
  );
}
