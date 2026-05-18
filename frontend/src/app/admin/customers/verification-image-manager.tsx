"use client";

import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE } from "@/lib/app-theme";
import { toaster } from "@/lib/toaster";

import { VerificationImageGallery } from "./verification-image-gallery";

type CustomerPayload = {
  verificationImageUrls: unknown;
};

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_IMAGES = 10;

function parseUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0,
  );
}

function isImageFile(file: File): boolean {
  return (
    ACCEPT.split(",").includes(file.type) ||
    file.type.startsWith("image/")
  );
}

function normalizePastedFile(file: File): File | null {
  if (!file.type.startsWith("image/")) return null;
  const mime =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
      ? file.type
      : "image/png";
  if (file.name && file.name !== "image.png" && file.name !== "blob")
    return new File([file], file.name, { type: mime });
  const ext =
    mime === "image/jpeg" ? ".jpg" : mime === "image/webp" ? ".webp" : ".png";
  return new File([file], `cccd-${Date.now()}${ext}`, { type: mime });
}

function filesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const out: File[] = [];
  for (const item of data.items) {
    if (item.kind !== "file") continue;
    const raw = item.getAsFile();
    if (!raw) continue;
    const file = normalizePastedFile(raw);
    if (file && isImageFile(file)) out.push(file);
  }
  return out;
}

function filesFromFileList(list: FileList | null): File[] {
  if (!list?.length) return [];
  return Array.from(list).filter(isImageFile);
}

export function VerificationImageManager({
  customerId,
  urls,
  onUpdated,
}: {
  customerId: string;
  urls: string[];
  onUpdated: (verificationImageUrls: string[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteZoneRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${apiBase()}/api/customers/${encodeURIComponent(customerId)}/verification-images`,
      {
        method: "POST",
        credentials: "include",
        body: form,
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || res.statusText);
    }
    const json = (await res.json()) as CustomerPayload;
    return parseUrls(json.verificationImageUrls);
  };

  const uploadFiles = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      if (urls.length + files.length > MAX_IMAGES) {
        toaster.error({
          title: `Tối đa ${MAX_IMAGES} ảnh`,
          description: `Hiện có ${urls.length} ảnh.`,
        });
        return;
      }

      void (async () => {
        setUploading(true);
        try {
          let latest = urls;
          for (const file of files) {
            latest = await uploadFile(file);
          }
          onUpdated(latest);
          toaster.success({
            title: files.length > 1 ? `Đã thêm ${files.length} ảnh` : "Đã thêm ảnh",
          });
        } catch (e) {
          toaster.error({
            title: "Không tải được ảnh",
            description: e instanceof Error ? e.message : "Lỗi upload",
          });
        } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      })();
    },
    [customerId, onUpdated, urls],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (uploading || urls.length >= MAX_IMAGES) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']"))
        return;

      const files = filesFromClipboard(e.clipboardData);
      if (!files.length) return;

      e.preventDefault();
      uploadFiles(files);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [uploadFiles, uploading, urls.length]);

  const handlePasteZone = (e: React.ClipboardEvent) => {
    const files = filesFromClipboard(e.clipboardData);
    if (!files.length) return;
    e.preventDefault();
    uploadFiles(files);
  };

  const handleDelete = (url: string) => {
    if (!window.confirm("Xóa ảnh CCCD này?")) return;
    void (async () => {
      setDeletingUrl(url);
      try {
        const res = await fetch(
          `${apiBase()}/api/customers/${encodeURIComponent(customerId)}/verification-images`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || res.statusText);
        }
        const json = (await res.json()) as CustomerPayload;
        onUpdated(parseUrls(json.verificationImageUrls));
        toaster.success({ title: "Đã xóa ảnh" });
      } catch (e) {
        toaster.error({
          title: "Không xóa được ảnh",
          description: e instanceof Error ? e.message : "Lỗi xóa",
        });
      } finally {
        setDeletingUrl(null);
      }
    })();
  };

  const atLimit = urls.length >= MAX_IMAGES;

  return (
    <Stack gap={4}>
      <Box
        ref={pasteZoneRef}
        tabIndex={0}
        role="button"
        aria-label="Dán ảnh CCCD từ clipboard"
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={uploading ? "ocean.300" : "ocean.200"}
        borderRadius="md"
        bg="white"
        px={4}
        py={5}
        cursor={atLimit || uploading ? "not-allowed" : "pointer"}
        opacity={atLimit ? 0.6 : 1}
        outline="none"
        _focusVisible={{
          borderColor: "ocean.500",
          boxShadow: "0 0 0 1px var(--chakra-colors-ocean-500)",
        }}
        onClick={() => {
          if (!atLimit && !uploading) pasteZoneRef.current?.focus();
        }}
        onPaste={handlePasteZone}
      >
        <Stack gap={1} textAlign="center" pointerEvents="none">
          <Text fontSize="sm" fontWeight="semibold" color="fg.default">
            Dán ảnh CCCD (Ctrl+V / ⌘V)
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Copy ảnh từ Zalo, Messenger, … rồi vào trang này và dán — không cần
            tải về máy
          </Text>
        </Stack>
      </Box>

      <HStack gap={3} flexWrap="wrap" align="center">
        <Button
          type="button"
          size="sm"
          variant="outline"
          colorPalette={APP_COLOR_PALETTE}
          loading={uploading}
          disabled={uploading || atLimit}
          onClick={() => fileInputRef.current?.click()}
        >
          Chọn file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => uploadFiles(filesFromFileList(e.target.files))}
        />
        <Text fontSize="sm" color="fg.muted">
          JPG, PNG, WebP — tối đa 5 MB/ảnh · {urls.length}/{MAX_IMAGES} ảnh
        </Text>
      </HStack>

      {urls.length > 0 ? (
        <VerificationImageGallery
          urls={urls}
          onDeleteUrl={handleDelete}
          deletingUrl={deletingUrl}
        />
      ) : (
        <Text fontSize="sm" color="fg.muted">
          Chưa có ảnh CCCD. Dán hoặc chọn file để thêm.
        </Text>
      )}
    </Stack>
  );
}
