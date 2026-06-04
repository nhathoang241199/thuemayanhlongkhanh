"use client";

import {
  Box,
  Button,
  CheckboxControl,
  CheckboxHiddenInput,
  CheckboxLabel,
  CheckboxRoot,
  CardBody,
  CardRoot,
  CardTitle,
  createIcon,
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
  Image,
  Input,
  NativeSelectField,
  NativeSelectIndicator,
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
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";

import {
  AdminDataCard,
  AdminDataCardActions,
  AdminDataCardHeader,
  AdminDataCardRow,
} from "@/components/admin/admin-data-card";
import { AdminResponsiveTable } from "@/components/admin/admin-responsive-table";
import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE, cardSurfaceProps } from "@/lib/app-theme";

type AdminCamera = {
  id: string;
  name: string;
  brand: string;
};

type Lens = {
  id: string;
  name: string;
  quantity: number;
  dayPrice: number;
  shiftPrice: number;
  discountPercent: number;
  imageUrl: string | null;
  createdAt: string;
  cameras: AdminCamera[];
};

function formatDiscountLabel(percent: number): string {
  return percent > 0 ? `${percent}%` : "—";
}

const LENS_BRANDS = ["FUJIFILM", "CANON", "DJI"] as const;
type LensBrand = (typeof LENS_BRANDS)[number];

const BRAND_LABEL_VI: Record<LensBrand, string> = {
  FUJIFILM: "Fujifilm",
  CANON: "Canon",
  DJI: "DJI",
};

type LensFormFields = {
  filterBrand: LensBrand;
  cameraIds: string[];
  name: string;
  imageUrl: string;
  quantity: number;
  dayPrice: number;
  shiftPrice: number;
  discountPercent: number;
};

type EditForm = LensFormFields;

function parseLensBrand(raw: string): LensBrand {
  return LENS_BRANDS.includes(raw as LensBrand)
    ? (raw as LensBrand)
    : "CANON";
}

type CreateForm = LensFormFields;

function defaultLensFormFields(): LensFormFields {
  return {
    filterBrand: "CANON",
    cameraIds: [],
    name: "",
    imageUrl: "",
    quantity: 1,
    dayPrice: 0,
    shiftPrice: 0,
    discountPercent: 0,
  };
}

function formatCamerasSummary(cameras: AdminCamera[]): string {
  if (cameras.length === 0) return "—";
  if (cameras.length <= 2) {
    return cameras.map((c) => c.name).join(", ");
  }
  return `${cameras.length} máy`;
}

function cameraIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((id, i) => id === sb[i]);
}

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** Padding nội dung cho từng ô bảng ống kính */
const tableCellPad = { px: 4, py: 4 };

const PencilIcon = createIcon({
  displayName: "PencilIcon",
  path: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
    />
  ),
});

const TrashIcon = createIcon({
  displayName: "TrashIcon",
  path: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 6h18"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 11v6M14 11v6"
      />
    </>
  ),
});

function LensMobileCard({
  lens: c,
  deleting,
  onEdit,
  onDelete,
}: {
  lens: Lens;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <AdminDataCard>
      <AdminDataCardHeader>
        <HStack gap={3} align="center">
          {c.imageUrl ? (
            <Image
              src={c.imageUrl}
              alt={c.name}
              boxSize="12"
              objectFit="cover"
              borderRadius="md"
              flexShrink={0}
            />
          ) : (
            <Box
              boxSize="12"
              bg="ocean.100"
              borderRadius="md"
              flexShrink={0}
              aria-hidden
            />
          )}
          <Stack gap={0} minW={0}>
            <Text fontWeight="semibold" lineClamp={2}>
              {c.name}
            </Text>
            <Text fontSize="sm" color="fg.muted" lineClamp={2}>
              {formatCamerasSummary(c.cameras)}
            </Text>
          </Stack>
        </HStack>
      </AdminDataCardHeader>
      <AdminDataCardRow label="Số lượng">{c.quantity}</AdminDataCardRow>
      <AdminDataCardRow label="Giá / ngày">
        {vnd.format(c.dayPrice)}
      </AdminDataCardRow>
      <AdminDataCardRow label="Giá / buổi">
        {vnd.format(c.shiftPrice)}
      </AdminDataCardRow>
      <AdminDataCardRow label="Giảm giá">
        {formatDiscountLabel(c.discountPercent)}
      </AdminDataCardRow>
      <AdminDataCardActions>
        <Button
          size="sm"
          variant="outline"
          flex={1}
          colorPalette={APP_COLOR_PALETTE}
          onClick={onEdit}
        >
          <HStack gap={1}>
            <PencilIcon boxSize="1.1em" />
            <Text>Sửa</Text>
          </HStack>
        </Button>
        <Button
          size="sm"
          variant="outline"
          flex={1}
          colorPalette="red"
          loading={deleting}
          onClick={onDelete}
        >
          <HStack gap={1}>
            <TrashIcon boxSize="1.1em" />
            <Text>Xóa</Text>
          </HStack>
        </Button>
      </AdminDataCardActions>
    </AdminDataCard>
  );
}

function parseNonNegInt(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

function normalizeImageUrlInput(raw: string): string | null {
  const t = raw.trim();
  return t === "" ? null : t;
}

function parseDiscountPercent(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return n;
}

function formDirty(c: Lens, f: EditForm): boolean {
  const nextUrl = normalizeImageUrlInput(f.imageUrl);
  const existingIds = c.cameras.map((cam) => cam.id);
  return (
    !cameraIdsEqual(f.cameraIds, existingIds) ||
    f.name.trim() !== c.name ||
    nextUrl !== c.imageUrl ||
    f.quantity !== c.quantity ||
    f.dayPrice !== c.dayPrice ||
    f.shiftPrice !== c.shiftPrice ||
    f.discountPercent !== c.discountPercent
  );
}

function CameraCompatibilityPicker({
  cameras,
  filterBrand,
  onFilterBrandChange,
  selectedIds,
  onSelectedIdsChange,
}: {
  cameras: AdminCamera[];
  filterBrand: LensBrand;
  onFilterBrandChange: (brand: LensBrand) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}) {
  const filtered = useMemo(
    () => cameras.filter((c) => c.brand === filterBrand),
    [cameras, filterBrand],
  );

  return (
    <Box>
      <Text fontSize="sm" fontWeight="medium" mb={1}>
        Máy tương thích
      </Text>
      <NativeSelectRoot size="md" mb={2}>
        <NativeSelectField
          value={filterBrand}
          onChange={(e) => {
            const v = e.target.value as LensBrand;
            if (LENS_BRANDS.includes(v)) {
              onFilterBrandChange(v);
              onSelectedIdsChange([]);
            }
          }}
        >
          {LENS_BRANDS.map((b) => (
            <option key={b} value={b}>
              {BRAND_LABEL_VI[b]} — lọc danh sách máy
            </option>
          ))}
        </NativeSelectField>
        <NativeSelectIndicator />
      </NativeSelectRoot>
      {filtered.length === 0 ? (
        <Text fontSize="sm" color="fg.muted">
          Chưa có máy {BRAND_LABEL_VI[filterBrand]}.
        </Text>
      ) : (
        <Stack gap={2} maxH="12rem" overflowY="auto" pe={1}>
          {filtered.map((cam) => {
            const checked = selectedIds.includes(cam.id);
            return (
              <CheckboxRoot
                key={cam.id}
                checked={checked}
                onCheckedChange={(e) => {
                  const on = !!e.checked;
                  if (on) {
                    onSelectedIdsChange([...selectedIds, cam.id]);
                  } else {
                    onSelectedIdsChange(
                      selectedIds.filter((id) => id !== cam.id),
                    );
                  }
                }}
              >
                <CheckboxHiddenInput />
                <CheckboxControl />
                <CheckboxLabel fontSize="sm">{cam.name}</CheckboxLabel>
              </CheckboxRoot>
            );
          })}
        </Stack>
      )}
      <Text fontSize="xs" color="fg.muted" mt={1}>
        Đã chọn {selectedIds.length} máy (có thể chọn máy khác hãng sau khi đổi
        bộ lọc).
      </Text>
    </Box>
  );
}

export default function AdminLensesPage() {
  const [lenses, setLenses] = useState<Lens[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Lens | null>(null);
  const [cameras, setCameras] = useState<AdminCamera[]>([]);
  const [editForm, setEditForm] = useState<EditForm>(defaultLensFormFields());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(defaultLensFormFields());
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      setDeleteError(null);
      try {
        const [lensRes, camRes] = await Promise.all([
          fetch(`${apiBase()}/api/lenses`, {
            credentials: "include",
            signal: ac.signal,
          }),
          fetch(`${apiBase()}/api/cameras`, {
            credentials: "include",
            signal: ac.signal,
          }),
        ]);
        await throwIfNotOk(lensRes, "Lỗi tải dữ liệu");
        await throwIfNotOk(camRes, "Lỗi tải máy ảnh");
        const json = (await lensRes.json()) as Lens[];
        const cams = (await camRes.json()) as AdminCamera[];
        if (!ac.signal.aborted) {
          setLenses(json);
          setCameras(cams);
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        setLenses(null);
        const msg = toastApiError(e, "Lỗi tải dữ liệu");
        if (msg) setError(msg);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const closeModal = () => {
    setEditing(null);
    setModalError(null);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateError(null);
  };

  const openCreate = () => {
    setEditing(null);
    setModalError(null);
    setCreateForm(defaultLensFormFields());
    setCreateError(null);
    setCreateOpen(true);
  };

  const openEdit = (c: Lens) => {
    setCreateOpen(false);
    setCreateError(null);
    setEditing(c);
    const cameraIds = c.cameras.map((cam) => cam.id);
    const filterBrand = c.cameras[0]
      ? parseLensBrand(c.cameras[0].brand)
      : "CANON";
    setEditForm({
      filterBrand,
      cameraIds,
      name: c.name,
      imageUrl: c.imageUrl ?? "",
      quantity: c.quantity,
      dayPrice: c.dayPrice,
      shiftPrice: c.shiftPrice,
      discountPercent: c.discountPercent ?? 0,
    });
    setModalError(null);
  };

  const saveFromModal = () => {
    if (!editing) return;
    const name = editForm.name.trim();
    if (!name) {
      setModalError("Tên ống kính không được để trống.");
      return;
    }
    if (editForm.cameraIds.length === 0) {
      setModalError("Chọn ít nhất một máy tương thích.");
      return;
    }
    void (async () => {
      setSaving(true);
      setModalError(null);
      try {
        const res = await fetch(`${apiBase()}/api/lenses/${editing.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cameraIds: editForm.cameraIds,
            name,
            imageUrl: normalizeImageUrlInput(editForm.imageUrl),
            quantity: editForm.quantity,
            dayPrice: editForm.dayPrice,
            shiftPrice: editForm.shiftPrice,
            discountPercent: editForm.discountPercent,
          }),
        });
        await throwIfNotOk(res, "Lỗi lưu");
        const updated = (await res.json()) as Lens;
        setLenses((prev) =>
          prev ? prev.map((x) => (x.id === updated.id ? updated : x)) : null,
        );
        closeModal();
      } catch (e) {
        const msg = toastApiError(e, "Lỗi lưu");
        if (msg) setModalError(msg);
      } finally {
        setSaving(false);
      }
    })();
  };

  const submitCreate = () => {
    const name = createForm.name.trim();
    if (!name) {
      setCreateError("Tên ống kính không được để trống.");
      return;
    }
    if (createForm.cameraIds.length === 0) {
      setCreateError("Chọn ít nhất một máy tương thích.");
      return;
    }
    void (async () => {
      setCreateSaving(true);
      setCreateError(null);
      try {
        const body: Record<string, unknown> = {
          cameraIds: createForm.cameraIds,
          name,
          quantity: createForm.quantity,
          dayPrice: createForm.dayPrice,
          shiftPrice: createForm.shiftPrice,
          discountPercent: createForm.discountPercent,
        };
        const img = normalizeImageUrlInput(createForm.imageUrl);
        if (img) body.imageUrl = img;

        const res = await fetch(`${apiBase()}/api/lenses`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await throwIfNotOk(res, "Lỗi tạo ống kính");
        const created = (await res.json()) as Lens;
        setLenses((prev) => (prev ? [created, ...prev] : [created]));
        closeCreateModal();
      } catch (e) {
        const msg = toastApiError(e, "Lỗi tạo ống kính");
        if (msg) setCreateError(msg);
      } finally {
        setCreateSaving(false);
      }
    })();
  };

  const deleteLens = (c: Lens) => {
    if (
      !window.confirm(
        `Xóa máy "${c.name}"? Thao tác không hoàn tác.`,
      )
    ) {
      return;
    }
    void (async () => {
      setDeletingId(c.id);
      setDeleteError(null);
      try {
        const res = await fetch(`${apiBase()}/api/lenses/${c.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        await throwIfNotOk(res, "Lỗi xóa");
        setEditing((prev) => {
          if (prev?.id === c.id) {
            setModalError(null);
            return null;
          }
          return prev;
        });
        setLenses((prev) =>
          prev ? prev.filter((x) => x.id !== c.id) : null,
        );
      } catch (e) {
        const msg = toastApiError(e, "Lỗi xóa");
        if (msg) setDeleteError(msg);
      } finally {
        setDeletingId(null);
      }
    })();
  };

  const dialogOpen = editing !== null;
  const canSave =
    editing !== null &&
    editForm.name.trim().length > 0 &&
    formDirty(editing, editForm);

  const canSubmitCreate =
    createForm.name.trim().length > 0 && createForm.cameraIds.length > 0;

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <HStack justify="space-between" align="center" gap={4} flexWrap="wrap">
            <CardTitle textStyle="2xl">Quản lý ống kính</CardTitle>
            <Button
              type="button"
              size="sm"
              colorPalette={APP_COLOR_PALETTE}
              onClick={openCreate}
            >
              Thêm ống kính
            </Button>
          </HStack>
        </CardBody>
      </CardRoot>

      {error ? (
        <CardRoot borderWidth="1px" borderColor="red.300" bg="red.50">
          <CardBody>
            <Text color="red.fg" fontWeight="medium">
              {error}
            </Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {deleteError ? (
        <CardRoot borderWidth="1px" borderColor="red.300" bg="red.50">
          <CardBody>
            <Text color="red.fg" fontWeight="medium">
              {deleteError}
            </Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {loading && lenses === null && !error ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Text>Đang tải danh sách…</Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {lenses && lenses.length === 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Stack gap={2}>
              <Text>Chưa có máy nào trong hệ thống.</Text>
              <Text fontSize="sm" color="fg.muted">
                Bấm &quot;Thêm ống kính&quot; ở trên để tạo máy đầu tiên.
              </Text>
            </Stack>
          </CardBody>
        </CardRoot>
      ) : null}

      {lenses && lenses.length > 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody p={0}>
            <AdminResponsiveTable
              table={
                <TableScrollArea rounded="l2">
                  <TableRoot size="sm" native>
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader w="4rem" {...tableCellPad}>
                          Ảnh
                        </TableColumnHeader>
                        <TableColumnHeader {...tableCellPad}>
                          Máy tương thích
                        </TableColumnHeader>
                        <TableColumnHeader {...tableCellPad}>
                          Tên
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="end" {...tableCellPad}>
                          Số lượng
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="end" {...tableCellPad}>
                          Giá / ngày
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="end" {...tableCellPad}>
                          Giá / buổi
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="end" {...tableCellPad}>
                          Giảm giá
                        </TableColumnHeader>
                        <TableColumnHeader
                          minW="10.5rem"
                          textAlign="end"
                          {...tableCellPad}
                        >
                          Thao tác
                        </TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lenses.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell {...tableCellPad}>
                            {c.imageUrl ? (
                              <Image
                                src={c.imageUrl}
                                alt={c.name}
                                boxSize="10"
                                objectFit="cover"
                                borderRadius="md"
                              />
                            ) : (
                              <Box
                                boxSize="10"
                                bg="ocean.100"
                                borderRadius="md"
                                aria-hidden
                              />
                            )}
                          </TableCell>
                          <TableCell {...tableCellPad} maxW="14rem">
                            <Text fontSize="sm" lineClamp={2}>
                              {formatCamerasSummary(c.cameras)}
                            </Text>
                          </TableCell>
                          <TableCell fontWeight="medium" {...tableCellPad}>
                            {c.name}
                          </TableCell>
                          <TableCell textAlign="end" {...tableCellPad}>
                            {c.quantity}
                          </TableCell>
                          <TableCell
                            textAlign="end"
                            whiteSpace="nowrap"
                            {...tableCellPad}
                          >
                            {vnd.format(c.dayPrice)}
                          </TableCell>
                          <TableCell
                            textAlign="end"
                            whiteSpace="nowrap"
                            {...tableCellPad}
                          >
                            {vnd.format(c.shiftPrice)}
                          </TableCell>
                          <TableCell textAlign="end" {...tableCellPad}>
                            {formatDiscountLabel(c.discountPercent ?? 0)}
                          </TableCell>
                          <TableCell textAlign="end" {...tableCellPad}>
                            <HStack
                              gap={2}
                              flexWrap="wrap"
                              justify="flex-end"
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                colorPalette={APP_COLOR_PALETTE}
                                onClick={() => openEdit(c)}
                              >
                                <HStack gap={1}>
                                  <PencilIcon boxSize="1.1em" />
                                  <Text>Sửa</Text>
                                </HStack>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                loading={deletingId === c.id}
                                onClick={() => deleteLens(c)}
                              >
                                <HStack gap={1}>
                                  <TrashIcon boxSize="1.1em" />
                                  <Text>Xóa</Text>
                                </HStack>
                              </Button>
                            </HStack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableRoot>
                </TableScrollArea>
              }
              cards={lenses.map((c) => (
                <LensMobileCard
                  key={c.id}
                  lens={c}
                  deleting={deletingId === c.id}
                  onEdit={() => openEdit(c)}
                  onDelete={() => deleteLens(c)}
                />
              ))}
            />
          </CardBody>
        </CardRoot>
      ) : null}

      <DialogRoot
        open={dialogOpen}
        onOpenChange={(e) => {
          if (!e.open) closeModal();
        }}
        lazyMount
        unmountOnExit
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="lg" w="full" mx={4}>
            <DialogHeader>
              <DialogTitle>Sửa ống kính</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              {editing ? (
                <Stack gap={4}>
                  <CameraCompatibilityPicker
                    cameras={cameras}
                    filterBrand={editForm.filterBrand}
                    onFilterBrandChange={(filterBrand) =>
                      setEditForm((f) => ({ ...f, filterBrand }))
                    }
                    selectedIds={editForm.cameraIds}
                    onSelectedIdsChange={(cameraIds) =>
                      setEditForm((f) => ({ ...f, cameraIds }))
                    }
                  />
                  {modalError ? (
                    <Text color="red.fg" fontSize="sm" fontWeight="medium">
                      {modalError}
                    </Text>
                  ) : null}
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Tên ống kính
                    </Text>
                    <Input
                      value={editForm.name}
                      maxLength={255}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      URL ảnh sản phẩm
                    </Text>
                    <Input
                      value={editForm.imageUrl}
                      placeholder="https://…"
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          imageUrl: e.target.value,
                        }))
                      }
                    />
                    <Text fontSize="xs" color="fg.muted" mt={1}>
                      Để trống để bỏ ảnh. URL phải hợp lệ (theo API).
                    </Text>
                    {normalizeImageUrlInput(editForm.imageUrl) ? (
                      <Box mt={2}>
                        <Text fontSize="xs" fontWeight="medium" mb={1}>
                          Xem trước
                        </Text>
                        <Image
                          src={normalizeImageUrlInput(editForm.imageUrl)!}
                          alt="Xem trước"
                          boxSize="20"
                          objectFit="cover"
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="ocean.200"
                        />
                      </Box>
                    ) : null}
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Số lượng
                    </Text>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={String(editForm.quantity)}
                      onChange={(e) => {
                        const v = parseNonNegInt(e.target.value);
                        if (v === null) return;
                        setEditForm((f) => ({ ...f, quantity: v }));
                      }}
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Giá / ngày (VND)
                    </Text>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={String(editForm.dayPrice)}
                      onChange={(e) => {
                        const v = parseNonNegInt(e.target.value);
                        if (v === null) return;
                        setEditForm((f) => ({ ...f, dayPrice: v }));
                      }}
                    />
                    <Text fontSize="xs" color="fg.muted" mt={1}>
                      {vnd.format(editForm.dayPrice)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Giá / buổi (VND)
                    </Text>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={String(editForm.shiftPrice)}
                      onChange={(e) => {
                        const v = parseNonNegInt(e.target.value);
                        if (v === null) return;
                        setEditForm((f) => ({ ...f, shiftPrice: v }));
                      }}
                    />
                    <Text fontSize="xs" color="fg.muted" mt={1}>
                      {vnd.format(editForm.shiftPrice)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Giảm giá (%)
                    </Text>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={String(editForm.discountPercent)}
                      onChange={(e) => {
                        const v = parseDiscountPercent(e.target.value);
                        if (v === null) return;
                        setEditForm((f) => ({ ...f, discountPercent: v }));
                      }}
                    />
                    <Text fontSize="xs" color="fg.muted" mt={1}>
                      0 = không giảm. Chỉ áp dụng tiền thuê máy.
                    </Text>
                  </Box>
                </Stack>
              ) : null}
            </DialogBody>
            <DialogFooter gap={2}>
              <Button variant="ghost" onClick={closeModal}>
                Hủy
              </Button>
              <Button
                variant="solid"
                colorPalette={APP_COLOR_PALETTE}
                loading={saving}
                disabled={!canSave}
                onClick={saveFromModal}
              >
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      <DialogRoot
        open={createOpen}
        onOpenChange={(e) => {
          if (!e.open) closeCreateModal();
        }}
        lazyMount
        unmountOnExit
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent maxW="lg" w="full" mx={4}>
            <DialogHeader>
              <DialogTitle>Thêm ống kính</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <Stack gap={4}>
                {createError ? (
                  <Text color="red.fg" fontSize="sm" fontWeight="medium">
                    {createError}
                  </Text>
                ) : null}
                <CameraCompatibilityPicker
                  cameras={cameras}
                  filterBrand={createForm.filterBrand}
                  onFilterBrandChange={(filterBrand) =>
                    setCreateForm((f) => ({ ...f, filterBrand }))
                  }
                  selectedIds={createForm.cameraIds}
                  onSelectedIdsChange={(cameraIds) =>
                    setCreateForm((f) => ({ ...f, cameraIds }))
                  }
                />
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Tên ống kính
                  </Text>
                  <Input
                    value={createForm.name}
                    maxLength={255}
                    placeholder="Ví dụ: EOS R50 kit 18-45mm"
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    URL ảnh sản phẩm (tuỳ chọn)
                  </Text>
                  <Input
                    value={createForm.imageUrl}
                    placeholder="https://…"
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        imageUrl: e.target.value,
                      }))
                    }
                  />
                  <Text fontSize="xs" color="fg.muted" mt={1}>
                    URL hợp lệ theo API. Để trống nếu chưa có ảnh.
                  </Text>
                  {normalizeImageUrlInput(createForm.imageUrl) ? (
                    <Box mt={2}>
                      <Text fontSize="xs" fontWeight="medium" mb={1}>
                        Xem trước
                      </Text>
                      <Image
                        src={normalizeImageUrlInput(createForm.imageUrl)!}
                        alt="Xem trước"
                        boxSize="20"
                        objectFit="cover"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="ocean.200"
                      />
                    </Box>
                  ) : null}
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Số lượng
                  </Text>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={String(createForm.quantity)}
                    onChange={(e) => {
                      const v = parseNonNegInt(e.target.value);
                      if (v === null) return;
                      setCreateForm((f) => ({ ...f, quantity: v }));
                    }}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Giá / ngày (VND)
                  </Text>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={String(createForm.dayPrice)}
                    onChange={(e) => {
                      const v = parseNonNegInt(e.target.value);
                      if (v === null) return;
                      setCreateForm((f) => ({ ...f, dayPrice: v }));
                    }}
                  />
                  <Text fontSize="xs" color="fg.muted" mt={1}>
                    {vnd.format(createForm.dayPrice)}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Giá / buổi (VND)
                  </Text>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={String(createForm.shiftPrice)}
                    onChange={(e) => {
                      const v = parseNonNegInt(e.target.value);
                      if (v === null) return;
                      setCreateForm((f) => ({ ...f, shiftPrice: v }));
                    }}
                  />
                  <Text fontSize="xs" color="fg.muted" mt={1}>
                    {vnd.format(createForm.shiftPrice)}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Giảm giá (%)
                  </Text>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={String(createForm.discountPercent)}
                    onChange={(e) => {
                      const v = parseDiscountPercent(e.target.value);
                      if (v === null) return;
                      setCreateForm((f) => ({ ...f, discountPercent: v }));
                    }}
                  />
                  <Text fontSize="xs" color="fg.muted" mt={1}>
                    0 = không giảm. Chỉ áp dụng tiền thuê máy.
                  </Text>
                </Box>
              </Stack>
            </DialogBody>
            <DialogFooter gap={2}>
              <Button variant="ghost" onClick={closeCreateModal}>
                Hủy
              </Button>
              <Button
                variant="solid"
                colorPalette={APP_COLOR_PALETTE}
                loading={createSaving}
                disabled={!canSubmitCreate}
                onClick={submitCreate}
              >
                Tạo máy
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Stack>
  );
}
