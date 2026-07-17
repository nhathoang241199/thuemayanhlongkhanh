"use client";

import {
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";

import {
  APP_COLOR_PALETTE,
  cardSurfaceProps,
  fieldInputProps,
} from "@/lib/app-theme";
import { apiBase } from "@/lib/api-base";
import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import { toaster } from "@/lib/toaster";

import { PolicyRagTestPanel } from "./policy-rag-test-panel";
import { MessengerChatSimulator } from "./messenger-chat-simulator";

type BookingTerms = {
  content: string;
  updatedAt?: string;
};

export default function AdminTermsPage() {
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/api/booking-terms`, {
        credentials: "include",
        signal,
      });
      await throwIfNotOk(res, "Lỗi tải điều khoản");
      const json = (await res.json()) as BookingTerms;
      if (!signal?.aborted) {
        setContent(json.content);
        setSavedContent(json.content);
      }
    } catch (e) {
      if (signal?.aborted) return;
      const msg = toastApiError(e, "Lỗi tải điều khoản");
      if (msg) setError(msg);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const dirty = content !== savedContent;

  const save = () => {
    void (async () => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase()}/api/booking-terms`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        await throwIfNotOk(res, "Không lưu được điều khoản");
        const json = (await res.json()) as BookingTerms;
        setContent(json.content);
        setSavedContent(json.content);
        toaster.success({ title: "Đã lưu điều khoản" });
      } catch (e) {
        const msg = toastApiError(e, "Không lưu được điều khoản");
        if (msg) setError(msg);
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={4}>
            <CardTitle textStyle="lg">Điều khoản đặt lịch</CardTitle>
            <Text fontSize="sm" color="fg.muted">
              Nội dung hiển thị khi khách bấm &quot;điều khoản&quot; ở bước xác
              nhận. Để trống = không bắt khách tick xác nhận. Gợi ý format RAG:
              dòng IN HOA (section), mỗi ý một dòng bắt đầu &quot;- &quot;.
            </Text>
            {error ? (
              <Text color="red.fg" fontSize="sm" fontWeight="medium">
                {error}
              </Text>
            ) : null}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Nội dung
              </Text>
              <Textarea
                value={content}
                rows={16}
                placeholder={"CÁCH THỨC THUÊ & CỌC\n\n- Khách mang CCCD...\n- Cọc 2 triệu...\n\nQUY ĐỊNH ĐỀN BÙ\n\n- Nếu hỏng máy..."}
                disabled={loading}
                {...fieldInputProps}
                onChange={(e) => setContent(e.target.value)}
              />
            </Box>
            <Button
              type="button"
              colorPalette={APP_COLOR_PALETTE}
              alignSelf="flex-start"
              loading={saving}
              disabled={loading || !dirty}
              onClick={save}
            >
              Lưu
            </Button>
          </Stack>
        </CardBody>
      </CardRoot>

      <MessengerChatSimulator />
      <PolicyRagTestPanel />
    </Stack>
  );
}
