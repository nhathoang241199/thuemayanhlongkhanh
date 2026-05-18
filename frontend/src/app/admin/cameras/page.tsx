"use client";

import {
  Box,
  Button,
  CardBody,
  CardDescription,
  CardHeader,
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
import { useEffect, useState } from "react";

import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE, cardSurfaceProps } from "@/lib/app-theme";

type Camera = {
  id: string;
  brand: string;
  name: string;
  quantity: number;
  dayPrice: number;
  shiftPrice: number;
  imageUrl: string | null;
  tutorialVideoUrl: string | null;
  createdAt: string;
};

const CAMERA_BRANDS = ["FUJIFILM", "CANON", "DJI"] as const;
type CameraBrand = (typeof CAMERA_BRANDS)[number];

const BRAND_LABEL_VI: Record<CameraBrand, string> = {
  FUJIFILM: "Fujifilm",
  CANON: "Canon",
  DJI: "DJI",
};

type EditForm = {
  brand: CameraBrand;
  name: string;
  imageUrl: string;
  tutorialVideoUrl: string;
  quantity: number;
  dayPrice: number;
  shiftPrice: number;
};

function parseCameraBrand(raw: string): CameraBrand {
  return CAMERA_BRANDS.includes(raw as CameraBrand)
    ? (raw as CameraBrand)
    : "CANON";
}

type CreateForm = {
  brand: CameraBrand;
  name: string;
  imageUrl: string;
  tutorialVideoUrl: string;
  quantity: number;
  dayPrice: number;
  shiftPrice: number;
};

function defaultCreateForm(): CreateForm {
  return {
    brand: "CANON",
    name: "",
    imageUrl: "",
    tutorialVideoUrl: "",
    quantity: 1,
    dayPrice: 350_000,
    shiftPrice: 200_000,
  };
}

function normalizeTutorialVideoUrl(raw: string): string | null {
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** Padding nội dung cho từng ô bảng máy ảnh */
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

function parseNonNegInt(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

function normalizeImageUrlInput(raw: string): string | null {
  const t = raw.trim();
  return t === "" ? null : t;
}

function formDirty(c: Camera, f: EditForm): boolean {
  const nextUrl = normalizeImageUrlInput(f.imageUrl);
  const nextVideo = normalizeTutorialVideoUrl(f.tutorialVideoUrl);
  return (
    f.brand !== parseCameraBrand(c.brand) ||
    f.name.trim() !== c.name ||
    nextUrl !== c.imageUrl ||
    nextVideo !== c.tutorialVideoUrl ||
    f.quantity !== c.quantity ||
    f.dayPrice !== c.dayPrice ||
    f.shiftPrice !== c.shiftPrice
  );
}

export default function AdminCamerasPage() {
  const [cameras, setCameras] = useState<Camera[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Camera | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    brand: "CANON",
    name: "",
    imageUrl: "",
    tutorialVideoUrl: "",
    quantity: 0,
    dayPrice: 0,
    shiftPrice: 0,
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreateForm);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      setDeleteError(null);
      try {
        const res = await fetch(`${apiBase()}/api/cameras`, {
          credentials: "include",
          signal: ac.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        const json = (await res.json()) as Camera[];
        if (!ac.signal.aborted) setCameras(json);
      } catch (e) {
        if (ac.signal.aborted) return;
        setCameras(null);
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
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
    setCreateForm(defaultCreateForm());
    setCreateError(null);
    setCreateOpen(true);
  };

  const openEdit = (c: Camera) => {
    setCreateOpen(false);
    setCreateError(null);
    setEditing(c);
    setEditForm({
      brand: parseCameraBrand(c.brand),
      name: c.name,
      imageUrl: c.imageUrl ?? "",
      tutorialVideoUrl: c.tutorialVideoUrl ?? "",
      quantity: c.quantity,
      dayPrice: c.dayPrice,
      shiftPrice: c.shiftPrice,
    });
    setModalError(null);
  };

  const saveFromModal = () => {
    if (!editing) return;
    const name = editForm.name.trim();
    if (!name) {
      setModalError("Tên máy không được để trống.");
      return;
    }
    void (async () => {
      setSaving(true);
      setModalError(null);
      try {
        const res = await fetch(`${apiBase()}/api/cameras/${editing.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand: editForm.brand,
            name,
            imageUrl: normalizeImageUrlInput(editForm.imageUrl),
            tutorialVideoUrl: normalizeTutorialVideoUrl(
              editForm.tutorialVideoUrl,
            ),
            quantity: editForm.quantity,
            dayPrice: editForm.dayPrice,
            shiftPrice: editForm.shiftPrice,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        const updated = (await res.json()) as Camera;
        setCameras((prev) =>
          prev ? prev.map((x) => (x.id === updated.id ? updated : x)) : null,
        );
        closeModal();
      } catch (e) {
        setModalError(e instanceof Error ? e.message : "Lỗi lưu");
      } finally {
        setSaving(false);
      }
    })();
  };

  const submitCreate = () => {
    const name = createForm.name.trim();
    if (!name) {
      setCreateError("Tên máy không được để trống.");
      return;
    }
    void (async () => {
      setCreateSaving(true);
      setCreateError(null);
      try {
        const body: Record<string, unknown> = {
          brand: createForm.brand,
          name,
          quantity: createForm.quantity,
          dayPrice: createForm.dayPrice,
          shiftPrice: createForm.shiftPrice,
        };
        const img = normalizeImageUrlInput(createForm.imageUrl);
        if (img) body.imageUrl = img;
        const video = normalizeTutorialVideoUrl(createForm.tutorialVideoUrl);
        if (video) body.tutorialVideoUrl = video;

        const res = await fetch(`${apiBase()}/api/cameras`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        const created = (await res.json()) as Camera;
        setCameras((prev) => (prev ? [created, ...prev] : [created]));
        closeCreateModal();
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : "Lỗi tạo máy");
      } finally {
        setCreateSaving(false);
      }
    })();
  };

  const deleteCamera = (c: Camera) => {
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
        const res = await fetch(`${apiBase()}/api/cameras/${c.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        setEditing((prev) => {
          if (prev?.id === c.id) {
            setModalError(null);
            return null;
          }
          return prev;
        });
        setCameras((prev) =>
          prev ? prev.filter((x) => x.id !== c.id) : null,
        );
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : "Lỗi xóa");
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
    createForm.name.trim().length > 0;

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardHeader>
          <HStack justify="space-between" align="flex-start" gap={4} flexWrap="wrap">
            <Box>
              <CardTitle textStyle="2xl">Quản lý máy ảnh</CardTitle>
              <CardDescription>
                Danh sách máy trong kho.{" "}
                <Text as="span" fontWeight="semibold">
                  Sửa
                </Text>{" "}
                (PATCH{" "}
                <Text as="span" fontWeight="semibold">
                  /api/cameras/:id
                </Text>
                ).
              </CardDescription>
            </Box>
            <Button
              type="button"
              size="sm"
              colorPalette={APP_COLOR_PALETTE}
              onClick={openCreate}
            >
              Thêm máy ảnh
            </Button>
          </HStack>
        </CardHeader>
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

      {loading && cameras === null && !error ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Text>Đang tải danh sách…</Text>
          </CardBody>
        </CardRoot>
      ) : null}

      {cameras && cameras.length === 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Stack gap={2}>
              <Text>Chưa có máy nào trong hệ thống.</Text>
              <Text fontSize="sm" color="fg.muted">
                Bấm &quot;Thêm máy ảnh&quot; ở trên để tạo máy đầu tiên.
              </Text>
            </Stack>
          </CardBody>
        </CardRoot>
      ) : null}

      {cameras && cameras.length > 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody p={0}>
            <TableScrollArea rounded="l2">
              <TableRoot size="sm" native>
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader w="4rem" {...tableCellPad}>
                      Ảnh
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>
                      Thương hiệu
                    </TableColumnHeader>
                    <TableColumnHeader {...tableCellPad}>Tên</TableColumnHeader>
                    <TableColumnHeader textAlign="end" {...tableCellPad}>
                      Số lượng
                    </TableColumnHeader>
                    <TableColumnHeader textAlign="end" {...tableCellPad}>
                      Giá / ngày
                    </TableColumnHeader>
                    <TableColumnHeader textAlign="end" {...tableCellPad}>
                      Giá / buổi
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
                  {cameras.map((c) => (
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
                      <TableCell {...tableCellPad}>{c.brand}</TableCell>
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
                            onClick={() => deleteCamera(c)}
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
          <DialogContent maxW="lg">
            <DialogHeader>
              <DialogTitle>Sửa máy ảnh</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              {editing ? (
                <Stack gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Thương hiệu
                    </Text>
                    <NativeSelectRoot size="md">
                      <NativeSelectField
                        value={editForm.brand}
                        onChange={(e) => {
                          const v = e.target.value as CameraBrand;
                          if (CAMERA_BRANDS.includes(v)) {
                            setEditForm((f) => ({ ...f, brand: v }));
                          }
                        }}
                      >
                        {CAMERA_BRANDS.map((b) => (
                          <option key={b} value={b}>
                            {BRAND_LABEL_VI[b]}
                          </option>
                        ))}
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                  </Box>
                  {modalError ? (
                    <Text color="red.fg" fontSize="sm" fontWeight="medium">
                      {modalError}
                    </Text>
                  ) : null}
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Tên máy
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
                      Link video hướng dẫn (YouTube)
                    </Text>
                    <Input
                      value={editForm.tutorialVideoUrl}
                      placeholder="https://www.youtube.com/watch?v=…"
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          tutorialVideoUrl: e.target.value,
                        }))
                      }
                    />
                    <Text fontSize="xs" color="fg.muted" mt={1}>
                      Để trống nếu chưa có video.
                    </Text>
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
          <DialogContent maxW="lg">
            <DialogHeader>
              <DialogTitle>Thêm máy ảnh</DialogTitle>
              <DialogCloseTrigger />
            </DialogHeader>
            <DialogBody>
              <Stack gap={4}>
                {createError ? (
                  <Text color="red.fg" fontSize="sm" fontWeight="medium">
                    {createError}
                  </Text>
                ) : null}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Thương hiệu
                  </Text>
                  <NativeSelectRoot size="md">
                    <NativeSelectField
                      value={createForm.brand}
                      onChange={(e) => {
                        const v = e.target.value as CameraBrand;
                        if (CAMERA_BRANDS.includes(v)) {
                          setCreateForm((f) => ({ ...f, brand: v }));
                        }
                      }}
                    >
                      {CAMERA_BRANDS.map((b) => (
                        <option key={b} value={b}>
                          {BRAND_LABEL_VI[b]}
                        </option>
                      ))}
                    </NativeSelectField>
                    <NativeSelectIndicator />
                  </NativeSelectRoot>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Tên máy
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
                    Link video hướng dẫn (YouTube, tuỳ chọn)
                  </Text>
                  <Input
                    value={createForm.tutorialVideoUrl}
                    placeholder="https://www.youtube.com/watch?v=…"
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        tutorialVideoUrl: e.target.value,
                      }))
                    }
                  />
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
