"use client";

import { Badge, HStack, Stack, Text } from "@chakra-ui/react";

import type { ShipOrder } from "@/lib/api";

function legLabel(leg: string): string {
  return leg === "OUTBOUND" ? "Giao máy" : "Trả máy";
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Chờ nhận";
    case "CLAIMED":
      return "Đang giao";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Hủy";
    default:
      return status;
  }
}

type AdminShipOrdersProps = {
  orders?: ShipOrder[];
};

export function AdminShipOrders({ orders }: AdminShipOrdersProps) {
  if (!orders?.length) return null;

  return (
    <Stack gap={1} mt={1}>
      {orders.map((s) => (
        <HStack key={s.id} gap={2} flexWrap="wrap" fontSize="xs">
          <Text color="fg.muted">{legLabel(s.leg)}:</Text>
          <Badge size="sm" variant="subtle">
            {statusLabel(s.status)}
          </Badge>
          {s.shipper?.name ? (
            <Text color="fg.muted">Shipper: {s.shipper.name}</Text>
          ) : null}
        </HStack>
      ))}
    </Stack>
  );
}
