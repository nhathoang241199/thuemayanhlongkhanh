"use client";

import {
  Badge,
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
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
  fetchAdminBookingOptions,
  fetchAdminShipperOptions,
  fetchAdminShipOrders,
  type AdminBookingOption,
  type AdminShipperOption,
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

const RETURN_ELIGIBLE_STATUSES = new Set(["PENDING_PAYMENT", "CONFIRMED", "RENTING"]);

function defaultScheduleInput(): string {
  const date = new Date(Date.now() + 30 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyForm(): AdminShipOrderInput {
  return {
    bookingId: "",
    leg: "OUTBOUND",
    shipperId: "",
    address: "",
    scheduleAt: defaultScheduleInput(),
  };
}

function statusLabel(order: ShipOrder): string {
  switch (order.displayStatus) {
    case "WAIT_CLAIM": return "Chưa nhận";
    case "WAIT_DELIVER": return "Đang giao";
    case "WAIT_RETURN": return order.leg === "RETURN" ? "Đang trả" : "Chờ trả";
    case "DONE": return "Hoàn thành";
    default: return order.status;
  }
}

function statusColor(order: ShipOrder): string {
  if (order.displayStatus === "DONE") return "green";
  if (order.displayStatus === "WAIT_DELIVER" || order.displayStatus === "WAIT_RETURN") return "orange";
  return "blue";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFmt.format(date);
}

function OrderTable({ orders }: { orders: ShipOrder[] }) {
  if (orders.length === 0) return <Text color="fg.muted">Chưa có đơn giao nào.</Text>;
  return (
    <TableScrollArea borderWidth="1px" borderRadius="md">
      <TableRoot size="sm" variant="outline" minW="900px">
        <TableHeader><TableRow>
          <TableColumnHeader>Booking</TableColumnHeader>
          <TableColumnHeader>Loại</TableColumnHeader>
          <TableColumnHeader>Khách hàng</TableColumnHeader>
          <TableColumnHeader>Địa chỉ</TableColumnHeader>
          <TableColumnHeader>Trạng thái</TableColumnHeader>
          <TableColumnHeader>Shipper</TableColumnHeader>
          <TableColumnHeader>Thời gian</TableColumnHeader>
        </TableRow></TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell fontWeight="semibold">{order.bookingCode}</TableCell>
              <TableCell>{order.leg === "OUTBOUND" ? "Giao máy" : "Trả máy"}</TableCell>
              <TableCell><Text>{order.customerName}</Text><Text fontSize="xs" color="fg.muted">{order.customerPhone}</Text></TableCell>
              <TableCell maxW="280px" whiteSpace="normal">{order.address}</TableCell>
              <TableCell><Badge colorPalette={statusColor(order)} variant="subtle">{statusLabel(order)}</Badge></TableCell>
              <TableCell>{order.shipperName ?? "Chưa có shipper"}</TableCell>
              <TableCell whiteSpace="nowrap">{formatDate(order.scheduleAt ?? order.requestedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableRoot>
    </TableScrollArea>
  );
}

function CreateOrderDialog({
  open,
  bookings,
  shippers,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  bookings: AdminBookingOption[];
  shippers: AdminShipperOption[];
  onOpenChange: (open: boolean) => void;
  onCreated: (order: ShipOrder) => void;
}) {
  const [form, setForm] = useState<AdminShipOrderInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selected = bookings.find((booking) => booking.id === form.bookingId);

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setError(null);
    }
  }, [open]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const order = await createAdminShipOrder({
        bookingId: form.bookingId,
        leg: form.leg,
        shipperId: form.shipperId,
        address: form.address,
        scheduleAt: new Date(form.scheduleAt).toISOString(),
      });
      onCreated(order);
      onOpenChange(false);
      toaster.success({ title: "Đã tạo đơn giao và thông báo shipper" });
    } catch (e) {
      const message = getApiErrorMessage(e, "Không thể tạo đơn giao");
      setError(message);
      toastApiError(e, "Không thể tạo đơn giao");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={(event) => onOpenChange(event.open)}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo đơn giao mới</DialogTitle></DialogHeader>
          <Box as="form" onSubmit={(event) => void submit(event as unknown as React.FormEvent<HTMLFormElement>)}>
            <DialogBody>
              <Stack gap={3}>
                <Box>
                  <Text fontSize="sm" mb={1}>Đơn thuê</Text>
                  <NativeSelectRoot {...fieldInputProps}>
                    <NativeSelectField value={form.bookingId} onChange={(event) => setForm((current) => ({ ...current, bookingId: event.target.value }))}>
                      <option value="">Chọn khách hàng</option>
                      {bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.customer.name} - {booking.customer.phone}</option>)}
                    </NativeSelectField>
                  </NativeSelectRoot>
                  {selected ? <Text mt={1} fontSize="xs" color="fg.muted">{selected.bookingCode}</Text> : null}
                </Box>
                <Box>
                  <Text fontSize="sm" mb={1}>Loại đơn</Text>
                  <NativeSelectRoot {...fieldInputProps}>
                    <NativeSelectField value={form.leg} onChange={(event) => setForm((current) => ({ ...current, leg: event.target.value as AdminShipOrderInput["leg"] }))}>
                      <option value="OUTBOUND">Cần giao</option>
                      <option value="RETURN">Cần trả</option>
                    </NativeSelectField>
                  </NativeSelectRoot>
                </Box>
                <Box>
                  <Text fontSize="sm" mb={1}>Shipper</Text>
                  <NativeSelectRoot {...fieldInputProps}>
                    <NativeSelectField value={form.shipperId} onChange={(event) => setForm((current) => ({ ...current, shipperId: event.target.value }))}>
                      <option value="">Chọn shipper</option>
                      {shippers.filter((shipper) => shipper.active).map((shipper) => <option key={shipper.id} value={shipper.id}>{shipper.name} - {shipper.phone}</option>)}
                    </NativeSelectField>
                  </NativeSelectRoot>
                </Box>
                <Box>
                  <Text fontSize="sm" mb={1}>Địa chỉ giao/trả</Text>
                  <Textarea {...fieldInputProps} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} rows={3} required />
                </Box>
                <Box>
                  <Text fontSize="sm" mb={1}>Thời gian shipper cần tới</Text>
                  <Input {...fieldInputProps} type="datetime-local" value={form.scheduleAt} onChange={(event) => setForm((current) => ({ ...current, scheduleAt: event.target.value }))} required />
                </Box>
                <Text fontSize="sm" color="fg.muted">Sau khi tạo, hệ thống sẽ thông báo tới tất cả shipper đã liên kết Messenger.</Text>
                {error ? <Text color="red.fg" fontSize="sm">{error}</Text> : null}
              </Stack>
            </DialogBody>
            <DialogFooter gap={2}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" colorPalette={ADMIN_COLOR_PALETTE} loading={saving} disabled={!form.bookingId || !form.shipperId}>Tạo đơn giao</Button>
            </DialogFooter>
          </Box>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}

export default function AdminShipOrdersPage() {
  const [orders, setOrders] = useState<ShipOrder[] | null>(null);
  const [bookings, setBookings] = useState<AdminBookingOption[]>([]);
  const [shippers, setShippers] = useState<AdminShipperOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shipOrders, bookingOptions, shipperOptions] = await Promise.all([fetchAdminShipOrders(), fetchAdminBookingOptions(), fetchAdminShipperOptions()]);
      setOrders(shipOrders);
      setBookings(bookingOptions.filter((booking) => RETURN_ELIGIBLE_STATUSES.has(booking.status)));
      setShippers(shipperOptions);
    } catch (e) {
      setError(getApiErrorMessage(e, "Không thể tải dữ liệu đơn giao"));
      toastApiError(e, "Không thể tải dữ liệu đơn giao");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Stack gap={5}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={4}>
            <HStack justify="space-between" align="center" gap={3}>
              <CardTitle color={titleColor}>Danh sách đơn giao</CardTitle>
              <HStack gap={2}>
                <Button size="sm" variant="outline" colorPalette={ADMIN_COLOR_PALETTE} onClick={() => void load()} loading={loading}>Làm mới</Button>
                <Button size="sm" colorPalette={ADMIN_COLOR_PALETTE} onClick={() => setDialogOpen(true)}>Tạo đơn giao</Button>
              </HStack>
            </HStack>
            {error ? <Text color="red.fg">{error}</Text> : null}
            {loading && !orders ? <Text color="fg.muted">Đang tải…</Text> : <OrderTable orders={orders ?? []} />}
          </Stack>
        </CardBody>
      </CardRoot>
      <CreateOrderDialog
        open={dialogOpen}
        bookings={bookings}
        shippers={shippers}
        onOpenChange={setDialogOpen}
        onCreated={(order) => setOrders((current) => (current ? [order, ...current] : [order]))}
      />
    </Stack>
  );
}
