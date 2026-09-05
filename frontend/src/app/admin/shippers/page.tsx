"use client";

import {
  Badge,
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  CheckboxControl,
  CheckboxHiddenInput,
  CheckboxLabel,
  CheckboxRoot,
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
  IconButton,
  Input,
  Stack,
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableRoot,
  TableRow,
  TableScrollArea,
  Text,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  QrCodeIcon,
  TrashIcon,
} from "@/app/admin/bookings/booking-list-icons";
import { ActionTooltip } from "@/components/admin/action-tooltip";
import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE, cardSurfaceProps, fieldInputProps } from "@/lib/app-theme";
import { formatVnd } from "@/lib/format-vnd";
import { resolveUploadUrl } from "@/lib/shipper-auth";
import { toaster } from "@/lib/toaster";

const tableCellPad = { px: 4, py: 3 };

type Shipper = {
  id: string;
  phone: string;
  name: string;
  active: boolean;
  balanceVnd: number;
  payoutQrUrl: string;
  payoutRequestedAt: string | null;
  messengerPsid: string;
};

function ShipperQrPreview({
  url,
  size = "80px",
}: {
  url: string;
  size?: string;
}) {
  const src = resolveUploadUrl(url);
  if (!src) {
    return (
      <Text fontSize="sm" color="fg.muted">
        Chưa có QR
      </Text>
    );
  }
  return (
    <Box
      w={size}
      maxW={size}
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="md"
      overflow="hidden"
      bg="white"
      flexShrink={0}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="QR nhận tiền"
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </Box>
  );
}

export default function AdminShippersPage() {
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<Shipper | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editClearMessenger, setEditClearMessenger] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const [qrViewTarget, setQrViewTarget] = useState<Shipper | null>(null);
  const [payoutTarget, setPayoutTarget] = useState<Shipper | null>(null);
  const [confirmingPayout, setConfirmingPayout] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shipper | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/api/shippers`, {
        credentials: "include",
      });
      await throwIfNotOk(res, "Lỗi tải shipper");
      setShippers((await res.json()) as Shipper[]);
    } catch (e) {
      const msg = toastApiError(e, "Lỗi tải shipper");
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setPhone("");
    setName("");
    setPassword("");
    setCreateError(null);
    setCreateOpen(true);
  };

  const create = () => {
    void (async () => {
      setSaving(true);
      setCreateError(null);
      try {
        const res = await fetch(`${apiBase()}/api/shippers`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, name, password }),
        });
        await throwIfNotOk(res, "Không tạo được shipper");
        setPhone("");
        setName("");
        setPassword("");
        setCreateOpen(false);
        toaster.success({ title: "Đã thêm shipper" });
        await load();
      } catch (e) {
        const msg = toastApiError(e, "Không tạo được shipper");
        if (msg) setCreateError(msg);
      } finally {
        setSaving(false);
      }
    })();
  };

  const startEdit = (s: Shipper) => {
    setEditTarget(s);
    setEditName(s.name);
    setEditPassword("");
    setEditActive(s.active);
    setEditClearMessenger(false);
    setEditError(null);
  };

  const saveEdit = () => {
    if (!editTarget) return;
    void (async () => {
      setEditSaving(true);
      setEditError(null);
      try {
        const body: {
          name: string;
          active: boolean;
          password?: string;
          clearMessengerPsid?: boolean;
        } = {
          name: editName,
          active: editActive,
        };
        if (editPassword.trim()) body.password = editPassword;
        if (editClearMessenger) body.clearMessengerPsid = true;
        const res = await fetch(`${apiBase()}/api/shippers/${editTarget.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await throwIfNotOk(res, "Không lưu shipper");
        setEditTarget(null);
        toaster.success({ title: "Đã cập nhật shipper" });
        await load();
      } catch (e) {
        const msg = toastApiError(e, "Không lưu shipper");
        if (msg) setEditError(msg);
      } finally {
        setEditSaving(false);
      }
    })();
  };

  const startQrPick = () => {
    if (!editTarget) return;
    qrInputRef.current?.click();
  };

  const uploadQr = (file: File | undefined) => {
    if (!file || !editTarget) return;
    const shipperId = editTarget.id;
    void (async () => {
      setQrUploading(true);
      setEditError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${apiBase()}/api/shippers/${shipperId}/payout-qr`, {
          method: "POST",
          credentials: "include",
          body: form,
        });
        await throwIfNotOk(res, "Không tải được QR");
        const updated = (await res.json()) as Shipper;
        setEditTarget(updated);
        toaster.success({ title: "Đã lưu QR nhận tiền" });
        await load();
      } catch (e) {
        const msg = toastApiError(e, "Không tải được QR");
        if (msg) setEditError(msg);
      } finally {
        setQrUploading(false);
        if (qrInputRef.current) qrInputRef.current.value = "";
      }
    })();
  };

  const submitPayout = () => {
    if (!payoutTarget) return;
    void (async () => {
      setConfirmingPayout(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBase()}/api/shippers/${payoutTarget.id}/confirm-payout`,
          { method: "POST", credentials: "include" },
        );
        await throwIfNotOk(res, "Không xác nhận thanh toán");
        setPayoutTarget(null);
        toaster.success({ title: "Đã trừ hết số dư" });
        await load();
      } catch (e) {
        const msg = toastApiError(e, "Không xác nhận thanh toán");
        if (msg) setError(msg);
      } finally {
        setConfirmingPayout(false);
      }
    })();
  };

  const submitDelete = () => {
    if (!deleteTarget) return;
    void (async () => {
      setDeleting(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase()}/api/shippers/${deleteTarget.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        await throwIfNotOk(res, "Không xoá được shipper");
        setDeleteTarget(null);
        if (editTarget?.id === deleteTarget.id) setEditTarget(null);
        if (payoutTarget?.id === deleteTarget.id) setPayoutTarget(null);
        toaster.success({ title: "Đã xoá shipper" });
        await load();
      } catch (e) {
        const msg = toastApiError(e, "Không xoá được shipper");
        if (msg) setError(msg);
      } finally {
        setDeleting(false);
      }
    })();
  };

  return (
    <Stack gap={6}>
      <input
        ref={qrInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => uploadQr(e.target.files?.[0])}
      />

      <CardRoot {...cardSurfaceProps}>
        <CardBody p={0}>
          <HStack
            justify="space-between"
            align="flex-start"
            gap={3}
            px={4}
            pt={4}
            pb={3}
          >
            <Stack gap={1}>
              <CardTitle textStyle="lg">Danh sách shipper</CardTitle>
              <Text fontSize="sm" color="fg.muted">
                QR nhận tiền riêng. Shipper gắn Messenger bằng tin fanpage:{" "}
                <Text as="span" fontFamily="mono">
                  SHIP &lt;SĐT&gt;
                </Text>
                .
              </Text>
            </Stack>
            <Button
              type="button"
              size="sm"
              colorPalette={APP_COLOR_PALETTE}
              flexShrink={0}
              onClick={openCreate}
            >
              <PlusIcon />
              Thêm
            </Button>
          </HStack>
          {error ? (
            <Text color="red.fg" fontSize="sm" px={4} pb={3}>
              {error}
            </Text>
          ) : null}
          {loading ? (
            <Text fontSize="sm" color="fg.muted" px={4} pb={4}>
              Đang tải…
            </Text>
          ) : shippers.length === 0 ? (
            <Text fontSize="sm" color="fg.muted" px={4} pb={4}>
              Chưa có shipper.
            </Text>
          ) : (
            <TableScrollArea>
              <TableRoot size="sm" native>
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader {...tableCellPad}>Tên</TableColumnHeader>
                        <TableColumnHeader {...tableCellPad}>SĐT</TableColumnHeader>
                        <TableColumnHeader textAlign="end" {...tableCellPad}>
                          Số dư
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="center" {...tableCellPad}>
                          Rút tiền
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="center" {...tableCellPad}>
                          FB
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="center" w="4rem" {...tableCellPad}>
                          QR
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="end" w="8rem" {...tableCellPad}>
                          Thao tác
                        </TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shippers.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell fontWeight="medium" {...tableCellPad}>
                              {s.name}
                            </TableCell>
                            <TableCell whiteSpace="nowrap" {...tableCellPad}>
                              {s.phone}
                            </TableCell>
                            <TableCell
                              textAlign="end"
                              whiteSpace="nowrap"
                              {...tableCellPad}
                            >
                              {formatVnd(s.balanceVnd)}
                            </TableCell>
                            <TableCell textAlign="center" {...tableCellPad}>
                              {s.payoutRequestedAt ? (
                                <Badge colorPalette="orange" size="sm" variant="subtle">
                                  Đang rút
                                </Badge>
                              ) : (
                                <Text fontSize="sm" color="fg.muted">
                                  —
                                </Text>
                              )}
                            </TableCell>
                            <TableCell textAlign="center" {...tableCellPad}>
                              {s.messengerPsid ? (
                                <Badge colorPalette="blue" size="sm" variant="subtle">
                                  Đã gắn
                                </Badge>
                              ) : (
                                <Text fontSize="sm" color="fg.muted">
                                  —
                                </Text>
                              )}
                            </TableCell>
                            <TableCell textAlign="center" {...tableCellPad}>
                              {s.payoutQrUrl ? (
                                <ActionTooltip label="Xem QR">
                                  <IconButton
                                    type="button"
                                    size="sm"
                                    variant="subtle"
                                    colorPalette="gray"
                                    aria-label={`Xem QR của ${s.name}`}
                                    onClick={() => setQrViewTarget(s)}
                                  >
                                    <QrCodeIcon />
                                  </IconButton>
                                </ActionTooltip>
                              ) : (
                                <Text fontSize="sm" color="fg.muted">
                                  —
                                </Text>
                              )}
                            </TableCell>
                            <TableCell textAlign="end" {...tableCellPad}>
                              <HStack gap={1} justify="flex-end">
                                <ActionTooltip
                                  label={
                                    s.payoutRequestedAt
                                      ? "Xác nhận thanh toán (đang yêu cầu rút)"
                                      : "Xác nhận thanh toán"
                                  }
                                >
                                  <IconButton
                                    type="button"
                                    size="sm"
                                    variant="subtle"
                                    colorPalette={
                                      s.payoutRequestedAt ? "orange" : "green"
                                    }
                                    aria-label={`Xác nhận thanh toán ${s.name}`}
                                    disabled={s.balanceVnd <= 0}
                                    onClick={() => setPayoutTarget(s)}
                                  >
                                    <CheckIcon />
                                  </IconButton>
                                </ActionTooltip>
                                <ActionTooltip label="Sửa">
                                  <IconButton
                                    type="button"
                                    size="sm"
                                    variant="subtle"
                                    colorPalette="blue"
                                    aria-label={`Sửa ${s.name}`}
                                    onClick={() => startEdit(s)}
                                  >
                                    <PencilIcon />
                                  </IconButton>
                                </ActionTooltip>
                                <ActionTooltip label="Xoá">
                                  <IconButton
                                    type="button"
                                    size="sm"
                                    variant="subtle"
                                    colorPalette="red"
                                    aria-label={`Xoá ${s.name}`}
                                    onClick={() => setDeleteTarget(s)}
                                  >
                                    <TrashIcon />
                                  </IconButton>
                                </ActionTooltip>
                              </HStack>
                            </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </TableRoot>
            </TableScrollArea>
          )}
        </CardBody>
      </CardRoot>

      <DialogRoot
        open={qrViewTarget !== null}
        onOpenChange={(e) => {
          if (!e.open) setQrViewTarget(null);
        }}
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="sm" w="full" mx={4}>
            <DialogHeader>
              <DialogTitle>QR nhận tiền</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <Stack gap={3}>
                <Text fontSize="sm" color="fg.muted">
                  {qrViewTarget?.name} · {qrViewTarget?.phone}
                </Text>
                {qrViewTarget ? (
                  <ShipperQrPreview url={qrViewTarget.payoutQrUrl} size="240px" />
                ) : null}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogCloseTrigger asChild>
                <Button type="button" variant="outline">
                  Đóng
                </Button>
              </DialogCloseTrigger>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      <DialogRoot
        open={createOpen}
        onOpenChange={(e) => {
          if (!e.open && !saving) setCreateOpen(false);
        }}
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="md" w="full" mx={4}>
            <DialogHeader>
              <DialogTitle>Thêm shipper</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <Stack gap={3}>
                <Text fontSize="sm" color="fg.muted">
                  Tài khoản đăng nhập là SĐT. Shipper vào{" "}
                  <Text as="span" fontWeight="medium">
                    /ship/login
                  </Text>
                  .
                </Text>
                {createError ? (
                  <Text color="red.fg" fontSize="sm">
                    {createError}
                  </Text>
                ) : null}
                <Box>
                  <Text fontSize="sm" mb={1}>
                    SĐT
                  </Text>
                  <Input
                    type="tel"
                    value={phone}
                    {...fieldInputProps}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" mb={1}>
                    Tên
                  </Text>
                  <Input
                    value={name}
                    {...fieldInputProps}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" mb={1}>
                    Mật khẩu
                  </Text>
                  <Input
                    type="password"
                    value={password}
                    {...fieldInputProps}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Box>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogCloseTrigger asChild>
                <Button type="button" variant="outline" disabled={saving}>
                  Huỷ
                </Button>
              </DialogCloseTrigger>
              <Button
                type="button"
                colorPalette={APP_COLOR_PALETTE}
                loading={saving}
                disabled={!phone.trim() || !name.trim() || !password.trim()}
                onClick={create}
              >
                Thêm
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      <DialogRoot
        open={editTarget !== null}
        onOpenChange={(e) => {
          if (!e.open && !editSaving && !qrUploading) setEditTarget(null);
        }}
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="md" w="full" mx={4}>
            <DialogHeader>
              <DialogTitle>Sửa shipper</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <Stack gap={3}>
                <Text fontSize="sm" color="fg.muted">
                  {editTarget?.name} · {editTarget?.phone}
                </Text>
                {editError ? (
                  <Text color="red.fg" fontSize="sm">
                    {editError}
                  </Text>
                ) : null}
                <Box>
                  <Text fontSize="sm" mb={1}>
                    QR nhận tiền
                  </Text>
                  <Stack gap={2}>
                    <ShipperQrPreview
                      url={editTarget?.payoutQrUrl ?? ""}
                      size="160px"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      alignSelf="flex-start"
                      loading={qrUploading}
                      onClick={startQrPick}
                    >
                      {editTarget?.payoutQrUrl ? "Đổi ảnh QR" : "Thêm ảnh QR"}
                    </Button>
                  </Stack>
                </Box>
                <Box>
                  <Text fontSize="sm" mb={1}>
                    Tên
                  </Text>
                  <Input
                    value={editName}
                    {...fieldInputProps}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" mb={1}>
                    Mật khẩu mới
                  </Text>
                  <Input
                    type="password"
                    placeholder="Để trống = giữ mật khẩu cũ"
                    value={editPassword}
                    {...fieldInputProps}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                </Box>
                <CheckboxRoot
                  checked={editActive}
                  onCheckedChange={(e) => setEditActive(!!e.checked)}
                >
                  <CheckboxHiddenInput />
                  <CheckboxControl />
                  <CheckboxLabel fontSize="sm">Hoạt động</CheckboxLabel>
                </CheckboxRoot>
                {editTarget?.messengerPsid ? (
                  <Stack gap={1}>
                    <Text fontSize="xs" color="fg.muted">
                      Messenger đã gắn (PSID …{editTarget.messengerPsid.slice(-6)})
                    </Text>
                    <CheckboxRoot
                      checked={editClearMessenger}
                      onCheckedChange={(e) => setEditClearMessenger(!!e.checked)}
                    >
                      <CheckboxHiddenInput />
                      <CheckboxControl />
                      <CheckboxLabel fontSize="sm">
                        Huỷ gắn Messenger
                      </CheckboxLabel>
                    </CheckboxRoot>
                  </Stack>
                ) : (
                  <Text fontSize="xs" color="fg.muted">
                    Chưa gắn FB — shipper nhắn fanpage: SHIP {editTarget?.phone}
                  </Text>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogCloseTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={editSaving || qrUploading}
                >
                  Huỷ
                </Button>
              </DialogCloseTrigger>
              <Button
                type="button"
                colorPalette={APP_COLOR_PALETTE}
                loading={editSaving}
                disabled={!editName.trim()}
                onClick={saveEdit}
              >
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      <DialogRoot
        open={payoutTarget !== null}
        onOpenChange={(e) => {
          if (!e.open && !confirmingPayout) setPayoutTarget(null);
        }}
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="sm" w="full" mx={4}>
            <DialogHeader>
              <DialogTitle>Xác nhận thanh toán?</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap={3}>
                <Text fontSize="sm">
                  Đã chuyển {formatVnd(payoutTarget?.balanceVnd ?? 0)} cho{" "}
                  {payoutTarget?.name} · {payoutTarget?.phone}? Số dư sẽ về 0.
                </Text>
                {payoutTarget?.payoutRequestedAt ? (
                  <Badge
                    colorPalette="orange"
                    size="sm"
                    variant="subtle"
                    w="fit-content"
                  >
                    Shipper đang yêu cầu rút
                  </Badge>
                ) : null}
                {payoutTarget ? (
                  <ShipperQrPreview url={payoutTarget.payoutQrUrl} size="200px" />
                ) : null}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogCloseTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={confirmingPayout}
                >
                  Huỷ
                </Button>
              </DialogCloseTrigger>
              <Button
                type="button"
                colorPalette={APP_COLOR_PALETTE}
                loading={confirmingPayout}
                onClick={submitPayout}
              >
                Xác nhận
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      <DialogRoot
        open={deleteTarget !== null}
        onOpenChange={(e) => {
          if (!e.open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xoá shipper?</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap={2}>
                <Text fontSize="sm">
                  Xoá {deleteTarget?.name} · {deleteTarget?.phone}. Tài khoản
                  này sẽ không đăng nhập được nữa.
                </Text>
                {deleteTarget && deleteTarget.balanceVnd > 0 ? (
                  <Text fontSize="sm" color="fg.muted">
                    Số dư còn {formatVnd(deleteTarget.balanceVnd)} sẽ mất theo
                    tài khoản.
                  </Text>
                ) : null}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogCloseTrigger asChild>
                <Button type="button" variant="outline" disabled={deleting}>
                  Huỷ
                </Button>
              </DialogCloseTrigger>
              <Button
                type="button"
                colorPalette="red"
                loading={deleting}
                onClick={submitDelete}
              >
                Xoá
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Stack>
  );
}
