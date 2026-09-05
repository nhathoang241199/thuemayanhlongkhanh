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

type PostDraft = {
  id: string;
  message: string;
  link: string | null;
  publishPublic: boolean;
  status: "pending" | "published" | "rejected";
  source: string;
  promotionNote: string | null;
  facebookPostId: string | null;
  rejectNote: string | null;
  createdAt: string;
  publishedAt: string | null;
};

function statusBadge(status: PostDraft["status"]) {
  if (status === "published") {
    return (
      <Badge colorPalette="green" size="sm">
        Đã đăng
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge colorPalette="red" size="sm">
        Đã từ chối
      </Badge>
    );
  }
  return (
    <Badge colorPalette="orange" size="sm">
      Chờ duyệt
    </Badge>
  );
}

export default function AdminFanpagePostsPage() {
  const [posts, setPosts] = useState<PostDraft[]>([]);
  const [filter, setFilter] = useState<"pending" | "published" | "rejected" | "all">(
    "pending",
  );
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edits, setEdits] = useState<
    Record<string, { message: string; publishPublic: boolean }>
  >({});

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const query =
        filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      const res = await fetch(`${apiBase()}/api/fanpage-posts${query}`, {
        credentials: "include",
        signal,
      });
      await throwIfNotOk(res, "Không tải danh sách bài");
      const json = (await res.json()) as PostDraft[];
      if (signal?.aborted) return;
      setPosts(json);
      setEdits(
        Object.fromEntries(
          json.map((p) => [
            p.id,
            { message: p.message, publishPublic: p.publishPublic },
          ]),
        ),
      );
    } catch (e) {
      if (signal?.aborted) return;
      toastApiError(e, "Lỗi tải bài fanpage");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const saveEdit = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    setBusyId(id);
    try {
      const res = await fetch(`${apiBase()}/api/fanpage-posts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: edit.message,
          publishPublic: edit.publishPublic,
        }),
      });
      await throwIfNotOk(res, "Không lưu chỉnh sửa");
      toaster.success({ title: "Đã lưu chỉnh sửa" });
      await load();
    } catch (e) {
      toastApiError(e, "Lỗi lưu");
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    const edit = edits[id];
    const publishPublic = edit?.publishPublic ?? post?.publishPublic ?? true;

    if (!publishPublic) {
      const ok = window.confirm(
        "Bài này đang ở chế độ PRIVATE — chỉ admin thấy trên Meta, không hiện trên fanpage công khai.\n\nBấm OK để duyệt private, hoặc Cancel rồi bấm \"Chuyển sang đăng công khai\" trước.",
      );
      if (!ok) return;
    }

    setBusyId(id);
    try {
      if (edit) {
        const patchRes = await fetch(`${apiBase()}/api/fanpage-posts/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: edit.message,
            publishPublic: edit.publishPublic,
          }),
        });
        await throwIfNotOk(patchRes, "Không lưu chỉnh sửa trước khi duyệt");
      }

      const res = await fetch(`${apiBase()}/api/fanpage-posts/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        postUrl?: string;
        publishPublic?: boolean;
        message?: string;
      };
      await throwIfNotOk(res, data.message ?? "Không duyệt bài");

      if (data.publishPublic === false) {
        toaster.success({
          title: "Đã gửi lên Meta (private)",
          description:
            "Chỉ admin thấy trên Meta Business Suite — không hiện fanpage công khai.",
        });
      } else {
        toaster.success({
          title: "Đã đăng lên fanpage",
          description: data.postUrl ?? undefined,
        });
      }
      await load();
    } catch (e) {
      toastApiError(e, "Lỗi duyệt bài");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`${apiBase()}/api/fanpage-posts/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await throwIfNotOk(res, "Không từ chối bài");
      toaster.success({ title: "Đã từ chối bài" });
      await load();
    } catch (e) {
      toastApiError(e, "Lỗi từ chối");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Stack gap={6}>
      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          <Stack gap={3}>
            <CardTitle textStyle="lg">Duyệt bài fanpage</CardTitle>
            <Text fontSize="sm" color="fg.muted">
              Hermes agent chỉ <strong>gửi draft</strong> — bạn duyệt ở đây
              mới đăng lên Page. Mặc định là <strong>private</strong> (chỉ admin
              thấy trên Meta). Bấm &quot;Chuyển sang đăng công khai&quot; nếu
              muốn khách thấy trên fanpage.
            </Text>
            <HStack gap={2} flexWrap="wrap">
              {(["pending", "published", "rejected", "all"] as const).map(
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
                        : key === "published"
                          ? "Đã đăng"
                          : "Đã từ chối"}
                  </Button>
                ),
              )}
            </HStack>
          </Stack>
        </CardBody>
      </CardRoot>

      <CardRoot {...cardSurfaceProps}>
        <CardBody>
          {loading ? (
            <Text color="fg.muted">Đang tải…</Text>
          ) : posts.length === 0 ? (
            <Text color="fg.muted">Không có bài nào.</Text>
          ) : (
            <Stack gap={4}>
              {posts.map((post) => {
                const edit = edits[post.id];
                return (
                  <Box
                    key={post.id}
                    borderWidth="1px"
                    borderColor="border.muted"
                    rounded="md"
                    p={4}
                  >
                    <Stack gap={3}>
                      <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        <HStack gap={2}>
                          {statusBadge(post.status)}
                          <Badge size="sm">{post.source}</Badge>
                          {!post.publishPublic ? (
                            <Badge colorPalette="purple" size="sm">
                              Private
                            </Badge>
                          ) : null}
                        </HStack>
                        <Text fontSize="xs" color="fg.muted">
                          {new Date(post.createdAt).toLocaleString("vi-VN")}
                        </Text>
                      </HStack>
                      {post.status === "pending" &&
                      !(edit?.publishPublic ?? post.publishPublic) ? (
                        <Text fontSize="sm" color="orange.fg">
                          ⚠ Chế độ private: duyệt xong chỉ admin thấy trên
                          Meta, không hiện trên fanpage công khai. Bấm
                          &quot;Chuyển sang đăng công khai&quot; nếu muốn khách
                          thấy.
                        </Text>
                      ) : null}
                      {post.promotionNote ? (
                        <Text fontSize="xs" color="fg.muted">
                          KM: {post.promotionNote}
                        </Text>
                      ) : null}
                      {post.link ? (
                        <Text fontSize="xs" color="fg.muted">
                          Link: {post.link}
                        </Text>
                      ) : null}
                      <Textarea
                        value={edit?.message ?? post.message}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [post.id]: {
                              message: e.target.value,
                              publishPublic:
                                prev[post.id]?.publishPublic ??
                                post.publishPublic,
                            },
                          }))
                        }
                        rows={Math.min(
                          8,
                          (edit?.message ?? post.message).split("\n").length + 2,
                        )}
                        disabled={post.status !== "pending"}
                        {...fieldInputProps}
                      />
                      {post.status === "pending" ? (
                        <HStack gap={2} flexWrap="wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            colorPalette={APP_COLOR_PALETTE}
                            loading={busyId === post.id}
                            onClick={() => void saveEdit(post.id)}
                          >
                            Lưu sửa
                          </Button>
                          <Button
                            size="sm"
                            colorPalette="green"
                            loading={busyId === post.id}
                            onClick={() => void approve(post.id)}
                          >
                            Duyệt & đăng
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            colorPalette="red"
                            loading={busyId === post.id}
                            onClick={() => void reject(post.id)}
                          >
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setEdits((prev) => ({
                                ...prev,
                                [post.id]: {
                                  message: prev[post.id]?.message ?? post.message,
                                  publishPublic: !(
                                    prev[post.id]?.publishPublic ??
                                    post.publishPublic
                                  ),
                                },
                              }))
                            }
                          >
                            {(edit?.publishPublic ?? post.publishPublic)
                              ? "Chuyển sang private"
                              : "Chuyển sang đăng công khai"}
                          </Button>
                        </HStack>
                      ) : post.facebookPostId ? (
                        <Stack gap={1}>
                          <Text fontSize="xs" color="fg.muted">
                            Facebook post ID: {post.facebookPostId}
                          </Text>
                          {!post.publishPublic ? (
                            <Text fontSize="xs" color="orange.fg">
                              Private trên Meta — chỉ admin thấy, không hiện
                              fanpage công khai.
                            </Text>
                          ) : null}
                        </Stack>
                      ) : post.rejectNote ? (
                        <Text fontSize="xs" color="red.fg">
                          {post.rejectNote}
                        </Text>
                      ) : null}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardBody>
      </CardRoot>
    </Stack>
  );
}
