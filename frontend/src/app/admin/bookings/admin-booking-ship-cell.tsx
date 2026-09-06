"use client";

import { Badge, Stack, Text } from "@chakra-ui/react";

import type { ShipOrder } from "@/lib/api";

type AdminBookingShipCellProps = {
  orders?: ShipOrder[];
};

type AdminShipDisplayStatus =
  | "WAIT_CLAIM"
  | "WAIT_DELIVER"
  | "WAIT_RETURN"
  | "DONE";

function resolveDisplayStatus(order: ShipOrder): AdminShipDisplayStatus {
  if (order.status === "CANCELLED") return "DONE";

  if (order.status === "PENDING") return "WAIT_CLAIM";
  if (order.status === "CLAIMED") return "WAIT_DELIVER";
  if (order.leg === "OUTBOUND") return "WAIT_RETURN";
  if (order.status === "READY") return "WAIT_RETURN";
  return "DONE";
}

function displayStatusLabel(status: AdminShipDisplayStatus): string {
  switch (status) {
    case "WAIT_CLAIM":
      return "Chưa nhận";
    case "WAIT_DELIVER":
      return "Đang giao";
    case "WAIT_RETURN":
      return "Đang trả";
    case "DONE":
      return "Hoàn thành";
  }
}

function displayStatusColor(status: AdminShipDisplayStatus): string {
  switch (status) {
    case "WAIT_CLAIM":
      return "blue";
    case "WAIT_DELIVER":
    case "WAIT_RETURN":
      return "orange";
    case "DONE":
      return "green";
  }
}

function selectCurrentShipOrder(orders?: ShipOrder[]): ShipOrder | undefined {
  if (!orders?.length) return undefined;

  const active = orders
    .filter(
      (order) =>
        order.status === "PENDING" ||
        order.status === "CLAIMED" ||
        order.status === "READY",
    )
    .sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );

  return active[0] ?? orders.find((order) => order.leg === "OUTBOUND") ?? orders[0];
}

export function AdminBookingShipCell({ orders }: AdminBookingShipCellProps) {
  const currentOrder = selectCurrentShipOrder(orders);

  if (!currentOrder) {
    return <Text color="fg.muted">—</Text>;
  }

  const displayStatus = resolveDisplayStatus(currentOrder);

  return (
    <Stack gap={1} align="flex-start">
      <Badge
        size="sm"
        variant="subtle"
        colorPalette={displayStatusColor(displayStatus)}
      >
        {displayStatusLabel(displayStatus)}
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
