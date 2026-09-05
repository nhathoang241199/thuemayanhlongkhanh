"use client";

import {
  Badge,
  Box,
  Button,
  CardBody,
  CardRoot,
  CardTitle,
  HStack,
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

type LearnStatus = {
  learnMode: boolean;
  botEnabled: boolean;
  webhookConfigured: boolean;
};

type LearnStats = {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
};

type LearnExample = {
  id: string;
  userMessage: string;
  ownerReply: string;
  status: "pending" | "approved" | "rejected";
  note?: string | null;
  psid: string;
  createdAt: string;
};

function statusBadge(status: LearnExample["status"]) {
  if (status === "approved") {
    return (
      <Badge colorPalette="green" size="sm">
        Đã duyệt
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge colorPalette="red" size="sm">
        Bỏ
      </Badge>
    );
  }
  return (
    <Badge colorPalette="orange" size="sm">
      Chờ duyệt
    </Badge>
  );
}

type LearnPending = {
  psid: string;
  userMessage: string;
  updatedAt: string;
};

export default function AdminMessengerLearnPage() {
  const [status, setStatus] = useState<LearnStatus | null>(null);
  const [stats, setStats] = useState<LearnStats | null>(null);
  const [examples, setExamples] = useState<LearnExample[]>([]);
  const [pendingTurns, setPendingTurns] = useState<LearnPending[]>([]);
  const [filter, setFilter] = useState<"all" | LearnExample["status"]>("pending");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const base = apiBase();
      const query =
        filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      const [statusRes, statsRes, examplesRes, pendingRes] = await Promise.all([
        fetch(`${base}/api/messenger/learn/status`, {
          credentials: "include",
          signal,
        }),
        fetch(`${base}/api/messenger/learn/stats`, {
          credentials: "include",
          signal,
        }),
        fetch(`${base}/api/messenger/learn/examples${query}`, {
          credentials: "include",
          signal,
        }),
        fetch(`${base}/api/messenger/learn/pending`, {
          credentials: "include",
          signal,
        }),
      ]);
      await throwIfNotOk(statusRes, "Không tải trạng thái");
      await throwIfNotOk(statsRes, "Không tải thống kê");
      await throwIfNotOk(examplesRes, "Không tải mẫu học");
      await throwIfNotOk(pendingRes, "Không tải tin chờ");
      if (signal?.aborted) return;
      setStatus((await statusRes.json()) as LearnStatus);
      setStats((await statsRes.json()) as LearnStats);
      setExamples((await examplesRes.json()) as LearnExample[]);
      setPendingTurns((await pendingRes.json()) as LearnPending[]);
    } catch (e) {
      if (signal?.aborted) return;
      toastApiError(e, "Lỗi tải dữ liệu học Messenger");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const syncFromFacebook = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${apiBase()}/api/messenger/learn/sync`, {
        method: "POST",
        credentials: "include",
      });
      await throwIfNotOk(res, "Không đồng bộ Facebook");
      const json = (await res.json()) as { synced: number };
      toaster.success({
        title:
          json.synced > 0
            ? `Đã lấy ${json.synced} mẫu từ Facebook Inbox`
            : "Không có mẫu mới từ Facebook",
      });
      await load();
    } catch (e) {
      toastApiError(e, "Lỗi đồng bộ Facebook");
    } finally {
      setSyncing(false);
    }
  };

  const updateExample = async (
    id: string,
    nextStatus: LearnExample["status"],
  ) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${apiBase()}/api/messenger/learn/examples/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await throwIfNotOk(res, "Không cập nhật mẫu");
      toaster.success({ title: "Đã cập nhật mẫu học" });
      await load();
    } catch (e) {
      toastApiError(e, "Lỗi cập nhật");
    } finally {
      setUpdatingId(null);
    }
  };

  const exportApproved = () => {
    const approved = examples.filter((e) => e.status === "approved");
    const blob = new Blob([JSON.stringify(approved, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `messenger-learn-approved-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={3}>
            <CardTitle textStyle="lg">Chế độ học Messenger</CardTitle>
            {status ? (
              <Stack gap={2}>
                <HStack gap={2} flexWrap="wrap">
                  <Badge
                    colorPalette={status.learnMode ? "green" : "gray"}
                    size="sm"
                  >
                    Học: {status.learnMode ? "Bật" : "Tắt"}
                  </Badge>
                  <Badge
                    colorPalette={status.botEnabled ? "blue" : "gray"}
                    size="sm"
                  >
                    Bot tự trả lời: {status.botEnabled ? "Bật" : "Tắt"}
                  </Badge>
                  <Badge
                    colorPalette={status.webhookConfigured ? "green" : "red"}
                    size="sm"
                  >
                    Webhook: {status.webhookConfigured ? "OK" : "Thiếu cấu hình"}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  Meta thường <strong>không gửi webhook</strong> khi bạn trả lời
                  từ Facebook Inbox — bấm <strong>Đồng bộ Facebook</strong> để
                  lấy câu trả lời qua Graph API.
                </Text>
                <Button
                  size="sm"
                  colorPalette={APP_COLOR_PALETTE}
                  loading={syncing}
                  onClick={() => void syncFromFacebook()}
                  alignSelf="flex-start"
                >
                  Đồng bộ Facebook
                </Button>
                <Text fontSize="sm" color="fg.muted">
                  Env VPS:{" "}
                  <code>MESSENGER_BOT_ENABLED=false</code> +{" "}
                  <code>MESSENGER_LEARN_MODE=true</code>. Meta webhook cần
                  subscribe thêm field <code>message_echoes</code> (không phải
                  message_echo).
                </Text>
              </Stack>
            ) : null}
            {stats ? (
              <Text fontSize="sm">
                Tổng {stats.total} mẫu — chờ {stats.pending}, duyệt{" "}
                {stats.approved}, bỏ {stats.rejected}
              </Text>
            ) : null}
          </Stack>
        </CardBody>
      </CardRoot>

      {pendingTurns.length > 0 ? (
        <CardRoot {...cardSurfaceProps}>
          <CardBody>
            <Stack gap={4}>
              <CardTitle textStyle="lg">
                Tin khách đã ghi — chờ bạn trả lời trên Inbox
              </CardTitle>
              {pendingTurns.map((row) => (
                <Box
                  key={`${row.psid}-${row.updatedAt}`}
                  borderWidth="1px"
                  borderColor="border.muted"
                  rounded="md"
                  p={4}
                >
                  <Stack gap={2}>
                    <HStack justify="space-between" flexWrap="wrap" gap={2}>
                      <Badge colorPalette="blue" size="sm">
                        Chờ trả lời
                      </Badge>
                      <Text fontSize="xs" color="fg.muted">
                        {new Date(row.updatedAt).toLocaleString("vi-VN")} · PSID{" "}
                        {row.psid.slice(0, 8)}…
                      </Text>
                    </HStack>
                    <Textarea
                      value={row.userMessage}
                      readOnly
                      rows={Math.min(
                        6,
                        row.userMessage.split("\n").length + 1,
                      )}
                      {...fieldInputProps}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardBody>
        </CardRoot>
      ) : null}

      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={4}>
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <CardTitle textStyle="lg">Mẫu hội thoại (khách → bạn)</CardTitle>
              <HStack gap={2} flexWrap="wrap">
                {(["pending", "approved", "rejected", "all"] as const).map(
                  (key) => (
                    <Button
                      key={key}
                      size="xs"
                      variant={filter === key ? "solid" : "outline"}
                      colorPalette={APP_COLOR_PALETTE}
                      onClick={() => setFilter(key)}
                    >
                      {key === "all"
                        ? "Tất cả"
                        : key === "pending"
                          ? "Chờ duyệt"
                          : key === "approved"
                            ? "Đã duyệt"
                            : "Đã bỏ"}
                    </Button>
                  ),
                )}
                <Button
                  size="xs"
                  variant="outline"
                  colorPalette={APP_COLOR_PALETTE}
                  onClick={exportApproved}
                  disabled={!examples.some((e) => e.status === "approved")}
                >
                  Export JSON (đã duyệt)
                </Button>
              </HStack>
            </HStack>

            {loading ? (
              <Text color="fg.muted">Đang tải…</Text>
            ) : examples.length === 0 ? (
              <Text color="fg.muted">
                Chưa có mẫu ghép cặp. Tin khách có thể đã ghi ở mục phía trên —
                trả lời trên Facebook Inbox để tạo mẫu.
              </Text>
            ) : (
              <Stack gap={4}>
                {examples.map((ex) => (
                  <Box
                    key={ex.id}
                    borderWidth="1px"
                    borderColor="border.muted"
                    rounded="md"
                    p={4}
                  >
                    <Stack gap={3}>
                      <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        {statusBadge(ex.status)}
                        <Text fontSize="xs" color="fg.muted">
                          {new Date(ex.createdAt).toLocaleString("vi-VN")} · PSID{" "}
                          {ex.psid.slice(0, 8)}…
                        </Text>
                      </HStack>
                      <Stack gap={1}>
                        <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                          Khách
                        </Text>
                        <Textarea
                          value={ex.userMessage}
                          readOnly
                          rows={Math.min(6, ex.userMessage.split("\n").length + 1)}
                          {...fieldInputProps}
                        />
                      </Stack>
                      <Stack gap={1}>
                        <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                          Bạn trả lời
                        </Text>
                        <Textarea
                          value={ex.ownerReply}
                          readOnly
                          rows={Math.min(4, ex.ownerReply.split("\n").length + 1)}
                          {...fieldInputProps}
                        />
                      </Stack>
                      {ex.status === "pending" ? (
                        <HStack gap={2}>
                          <Button
                            size="sm"
                            colorPalette="green"
                            loading={updatingId === ex.id}
                            onClick={() => void updateExample(ex.id, "approved")}
                          >
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            colorPalette="red"
                            loading={updatingId === ex.id}
                            onClick={() => void updateExample(ex.id, "rejected")}
                          >
                            Bỏ
                          </Button>
                        </HStack>
                      ) : null}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </CardBody>
      </CardRoot>
    </Stack>
  );
}
