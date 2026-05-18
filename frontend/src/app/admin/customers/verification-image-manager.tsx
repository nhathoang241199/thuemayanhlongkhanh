"use client";

import { Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";

import { apiBase } from "@/lib/api-base";
import { APP_COLOR_PALETTE } from "@/lib/app-theme";
import { toaster } from "@/lib/toaster";

import { VerificationImageGallery } from "./verification-image-gallery";

type CustomerPayload = {
  verificationImageUrls: unknown;
};

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_IMAGES = 10;

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
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  const parseUrls = (raw: unknown): string[] => {
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (u): u is string => typeof u === "string" && u.trim().length > 0,
    );
  };

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

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    if (urls.length + list.length > MAX_IMAGES) {
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
        for (const file of list) {
          latest = await uploadFile(file);
        }
        onUpdated(latest);
        toaster.success({ title: "Đã thêm ảnh" });
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

  return (
    <Stack gap={4}>
      <HStack gap={3} flexWrap="wrap" align="center">
        <Button
          type="button"
          size="sm"
          variant="solid"
          colorPalette={APP_COLOR_PALETTE}
          loading={uploading}
          disabled={uploading || urls.length >= MAX_IMAGES}
          onClick={() => fileInputRef.current?.click()}
        >
          Thêm ảnh
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
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
          Chưa có ảnh CCCD. Bấm &quot;Thêm ảnh&quot; để tải lên.
        </Text>
      )}
    </Stack>
  );
}
