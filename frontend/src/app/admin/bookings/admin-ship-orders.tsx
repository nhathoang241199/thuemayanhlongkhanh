"use client";

import { Stack, Text } from "@chakra-ui/react";

import type { ShipOrder } from "@/lib/api";

type AdminShipOrdersProps = {
  orders?: ShipOrder[];
};

export function AdminShipOrders({ orders }: AdminShipOrdersProps) {
  if (!orders?.length) return null;

  const names = [
    ...new Set(
      orders
        .map((s) => s.shipper?.name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  if (!names.length) return null;

  return (
    <Stack gap={0} mt={1}>
      {names.map((name) => (
        <Text key={name} fontSize="xs" color="fg.muted">
          {name}
        </Text>
      ))}
    </Stack>
  );
}
