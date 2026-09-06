"use client";

import {
  Badge,
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  HStack,
  Input,
  NativeSelectField,
  NativeSelectRoot,
  Stack,
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableRoot,
  TableRow,
  TableScrollArea,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";

import {
  createAdminShipOrder,
  fetchAdminShipOrders,
  type AdminShipOrderInput,
  type ShipOrder,
} from "@/lib/api";
import { getApiErrorMessage, toastApiError } from "@/lib/admin-api";
import { toaster } from "@/lib/toaster";
import {
  ADMIN_COLOR_PALETTE,
  cardSurfaceProps,
  fieldInputProps,
  titleColor,
} from "@/lib/app-theme";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

const emptyForm: AdminShipOrderInput = {
  bookingCode: "",
  leg: "OUTBOUND",
  customerName: "",
  customerPhone: "",
  address: "",
  notify: true,
};

function statusLabel(order: ShipOrder): string {
  switch (order.displayStatus) {
    case "WAIT_CLAIM":
      return "Chưa nhận";
    case "WAIT_DELIVER":
      return "Đang giao";
    case "WAIT_RETURN":
      return order.leg === "RETURN" ? "Đang trả" : "Chờ trả";
    case "DONE":
      return "Hoàn thành";
    default:
      return order.status;
  }
}

function statusColor(order: ShipOrder): string {
  if (order.displayStatus === "DONE") return "green";
  if (order.displayStatus === "WAIT_DELIVER" || order.displayStatus === "WAIT_RETURN") {
    return "orange";
  }
  return "blue";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFmt.format(date);
}

function OrderTable({ orders }: { orders: ShipOrder[] }) {
  if (orders.length === 0) {
    return <Text color="fg.muted">Chưa có đơn giao nào.</Text>;
  }

  return (
    <TableScrollArea borderWidth="1px" borderRadius="md">
      <TableRoot size="sm" variant="outline" minW="900px">
        <TableHeader>
          <TableRow>
            <TableColumnHeader>Booking</TableColumnHeader>
            <TableColumnHeader>Loại</TableColumnHeader>
            <TableColumnHeader>Khách hàng</TableColumnHeader>
            <TableColumnHeader>Địa chỉ</TableColumnHeader>
            <TableColumnHeader>Trạng thái</TableColumnHeader>
            <TableColumnHeader>Shipper</TableColumnHeader>
            <TableColumnHeader>Thời gian tạo</TableColumnHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell fontWeight="semibold">{order.bookingCode}</TableCell>
              <TableCell>{order.leg === "OUTBOUND" ? "Giao máy" : "Trả máy"}</TableCell>
              <TableCell>
                <Text>{order.customerName}</Text>
                <Text fontSize="xs" color="fg.muted">{order.customerPhone}</Text>
              </TableCell>
              <TableCell maxW="280px" whiteSpace="normal">{order.address}</TableCell>
              <TableCell>
                <Badge colorPalette={statusColor(order)} variant="subtle">
                  {statusLabel(order)}
                </Badge>
              </TableCell>
              <TableCell>{order.shipperName ?? "Chưa có shipper"}</TableCell>
              <TableCell whiteSpace="nowrap">{formatDate(order.requestedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableRoot>
    </TableScrollArea>
  );
}

function CreateOrderForm({
  onCreated,
}: {
  onCreated: (order: ShipOrder) => void;
}) {
  const [form, setForm] = useState<AdminShipOrderInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof AdminShipOrderInput>(
    key: K,
    value: AdminShipOrderInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const order = await createAdminShipOrder(form);
      onCreated(order);
      setForm(emptyForm);
      toaster.success({ title: "Đã tạo đơn giao" });
    } catch (e) {
      const message = getApiErrorMessage(e, "Không thể tạo đơn giao");
      setError(message);
      toastApiError(e, "Không thể tạo đơn giao");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      as="form"
      onSubmit={(event) => {
        void submit(event as unknown as React.FormEvent<HTMLFormElement>);
      }}
    >
      <Stack gap={3}>
        <HStack gap={3} align="flex-start" flexWrap={{ base: "wrap", md: "nowrap" }}>
          <Box flex="1" minW={{ base: "full", md: "220px" }}>
            <Text fontSize="sm" mb={1}>Mã đơn thuê</Text>
            <Input {...fieldInputProps} value={form.bookingCode} onChange={(e) => set("bookingCode", e.target.value)} placeholder="DH-20260906-ABCD" required />
          </Box>
          <Box w={{ base: "full", md: "180px" }}>
            <Text fontSize="sm" mb={1}>Loại đơn</Text>
            <NativeSelectRoot {...fieldInputProps}>
              <NativeSelectField value={form.leg} onChange={(e) => set("leg", e.target.value as AdminShipOrderInput["leg"])}>
                <option value="OUTBOUND">Giao máy</option>
                <option value="RETURN">Trả máy</option>
              </NativeSelectField>
            </NativeSelectRoot>
          </Box>
        </HStack>
        <HStack gap={3} align="flex-start" flexWrap={{ base: "wrap", md: "nowrap" }}>
          <Box flex="1" minW={{ base: "full", md: "220px" }}>
            <Text fontSize="sm" mb={1}>Tên khách</Text>
            <Input {...fieldInputProps} value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required />
          </Box>
          <Box flex="1" minW={{ base: "full", md: "220px" }}>
            <Text fontSize="sm" mb={1}>Số điện thoại</Text>
            <Input {...fieldInputProps} value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} required />
          </Box>
        </HStack>
        <Box>
          <Text fontSize="sm" mb={1}>Địa chỉ giao/trả</Text>
          <Textarea {...fieldInputProps} value={form.address} onChange={(e) => set("address", e.target.value)} rows={3} required />
        </Box>
        <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <Text fontSize="sm" color="fg.muted">Sau khi tạo, đơn sẽ ở trạng thái Chưa nhận.</Text>
          <Button type="submit" colorPalette={ADMIN_COLOR_PALETTE} loading={saving}>Tạo đơn giao</Button>
        </HStack>
        {error ? <Text color="red.fg" fontSize="sm">{error}</Text> : null}
      </Stack>
    </Box>
  );
}

export default function AdminShipOrdersPage() {
  const [orders, setOrders] = useState<ShipOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchAdminShipOrders());
    } catch (e) {
      setError(getApiErrorMessage(e, "Không thể tải danh sách đơn giao"));
      toastApiError(e, "Không thể tải danh sách đơn giao");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Stack gap={5}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={4}>
            <CardTitle color={titleColor}>Tạo đơn giao mới</CardTitle>
            <CreateOrderForm
              onCreated={(order) => {
                setOrders((current) => (current ? [order, ...current] : [order]));
              }}
            />
          </Stack>
        </CardBody>
      </CardRoot>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={4}>
            <HStack justify="space-between" align="center">
              <CardTitle color={titleColor}>Danh sách đơn giao</CardTitle>
              <Button size="sm" variant="outline" colorPalette={ADMIN_COLOR_PALETTE} onClick={() => void load()} loading={loading}>Làm mới</Button>
            </HStack>
            {error ? <Text color="red.fg">{error}</Text> : null}
            {loading && !orders ? <Text color="fg.muted">Đang tải…</Text> : <OrderTable orders={orders ?? []} />}
          </Stack>
        </CardBody>
      </CardRoot>
    </Stack>
  );
}
