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
  Link,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useCallback, useEffect, useState } from "react";

import { BlogBanner } from "@/components/blog/blog-banner";
import {
  APP_COLOR_PALETTE,
  cardSurfaceProps,
  fieldInputProps,
} from "@/lib/app-theme";
import { apiBase } from "@/lib/api-base";
import { throwIfNotOk, toastApiError } from "@/lib/admin-api";
import type { BlogPostAdmin } from "@/lib/blog-posts";
import {
  resolveBlogBannerUrl,
  uploadBlogBanner,
} from "@/lib/blog-banner-upload";
import { toaster } from "@/lib/toaster";

type EditState = {
  title: string;
  slug: string;
  excerpt: string;
  seoDescription: string;
  content: string;
  coverImageUrl: string;
};

function statusBadge(status: BlogPostAdmin["status"]) {
  if (status === "published") {
    return (
      <Badge colorPalette="green" size="sm">
        Đã xuất bản
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

export default function AdminBlogPostsPage() {
  const [posts, setPosts] = useState<BlogPostAdmin[]>([]);
  const [filter, setFilter] = useState<
    "pending" | "published" | "rejected" | "all"
  >("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const query =
        filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      const res = await fetch(`${apiBase()}/api/blog-posts${query}`, {
        credentials: "include",
        signal,
      });
      await throwIfNotOk(res, "Không tải danh sách bài");
      const json = (await res.json()) as BlogPostAdmin[];
      if (signal?.aborted) return;
      setPosts(json);
      setEdits(
        Object.fromEntries(
          json.map((p) => [
            p.id,
            {
              title: p.title,
              slug: p.slug,
              excerpt: p.excerpt ?? "",
              seoDescription: p.seoDescription ?? "",
              content: p.content,
              coverImageUrl: p.coverImageUrl ?? "",
            },
          ]),
        ),
      );
    } catch (e) {
      if (signal?.aborted) return;
      toastApiError(e, "Lỗi tải blog");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const patchBody = (edit: EditState) => ({
    title: edit.title,
    slug: edit.slug,
    excerpt: edit.excerpt || null,
    seoDescription: edit.seoDescription || null,
    content: edit.content,
    coverImageUrl: edit.coverImageUrl.trim() || null,
  });

  const saveEdit = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    setBusyId(id);
    try {
      const res = await fetch(`${apiBase()}/api/blog-posts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody(edit)),
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

  const publish = async (id: string) => {
    const edit = edits[id];
    const coverImageUrl =
      edit?.coverImageUrl.trim() ||
      posts.find((p) => p.id === id)?.coverImageUrl?.trim();
    if (!coverImageUrl) {
      toaster.error({
        title: "Thiếu banner",
        description: "Mỗi bài cần banner trước khi xuất bản.",
      });
      return;
    }

    setBusyId(id);
    try {
      const edit = edits[id];
      if (edit) {
        const patchRes = await fetch(`${apiBase()}/api/blog-posts/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody(edit)),
        });
        await throwIfNotOk(patchRes, "Không lưu chỉnh sửa trước khi duyệt");
      }

      const res = await fetch(`${apiBase()}/api/blog-posts/${id}/publish`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as BlogPostAdmin & { message?: string };
      await throwIfNotOk(res, data.message ?? "Không xuất bản bài");

      toaster.success({
        title: "Đã xuất bản blog",
        description: `/posts/${data.slug}`,
      });
      await load();
    } catch (e) {
      toastApiError(e, "Lỗi xuất bản");
    } finally {
      setBusyId(null);
    }
  };

  const uploadBanner = async (id: string, file: File) => {
    setBusyId(id);
    try {
      const data = await uploadBlogBanner(id, file);
      setEdits((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          coverImageUrl: data.coverImageUrl,
        },
      }));
      toaster.success({ title: "Đã upload banner" });
      await load();
    } catch (e) {
      toastApiError(e, "Lỗi upload banner");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`${apiBase()}/api/blog-posts/${id}/reject`, {
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
            <CardTitle textStyle="lg">Blog SEO</CardTitle>
            <Text fontSize="sm" color="fg.muted">
              Hermes agent gửi bài Markdown — bạn duyệt ở đây mới hiện trên{" "}
              <Link asChild color="cerulean.700">
                <NextLink href="/posts" target="_blank">
                  /posts
                </NextLink>
              </Link>
              . Không có link blog trên app khách. Mỗi bài cần{" "}
              <strong>banner</strong> trước khi xuất bản.
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
                          ? "Đã xuất bản"
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
                        </HStack>
                        <Text fontSize="xs" color="fg.muted">
                          {new Date(post.createdAt).toLocaleString("vi-VN")}
                        </Text>
                      </HStack>

                      {post.status === "pending" ? (
                        <>
                          {(edit?.coverImageUrl || post.coverImageUrl) ? (
                            <BlogBanner
                              src={resolveBlogBannerUrl(
                                edit?.coverImageUrl || post.coverImageUrl,
                              )}
                              alt={edit?.title ?? post.title}
                              variant="hero"
                            />
                          ) : (
                            <Text fontSize="sm" color="orange.fg">
                              ⚠ Chưa có banner — upload hoặc dán URL trước khi
                              xuất bản.
                            </Text>
                          )}
                          <HStack gap={2} flexWrap="wrap">
                            <Button
                              as="label"
                              size="sm"
                              variant="outline"
                              colorPalette={APP_COLOR_PALETTE}
                              cursor="pointer"
                              loading={busyId === post.id}
                            >
                              Upload banner
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                hidden
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void uploadBanner(post.id, file);
                                  e.target.value = "";
                                }}
                              />
                            </Button>
                          </HStack>
                          <Input
                            value={edit?.coverImageUrl ?? post.coverImageUrl ?? ""}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [post.id]: {
                                  ...prev[post.id],
                                  coverImageUrl: e.target.value,
                                },
                              }))
                            }
                            placeholder="URL banner (https://...)"
                            {...fieldInputProps}
                          />
                          <Input
                            value={edit?.title ?? post.title}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [post.id]: {
                                  ...prev[post.id],
                                  title: e.target.value,
                                },
                              }))
                            }
                            placeholder="Tiêu đề"
                            {...fieldInputProps}
                          />
                          <Input
                            value={edit?.slug ?? post.slug}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [post.id]: {
                                  ...prev[post.id],
                                  slug: e.target.value,
                                },
                              }))
                            }
                            placeholder="slug-url"
                            {...fieldInputProps}
                          />
                          <Input
                            value={edit?.excerpt ?? post.excerpt ?? ""}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [post.id]: {
                                  ...prev[post.id],
                                  excerpt: e.target.value,
                                },
                              }))
                            }
                            placeholder="Tóm tắt (SEO)"
                            {...fieldInputProps}
                          />
                          <Input
                            value={
                              edit?.seoDescription ?? post.seoDescription ?? ""
                            }
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [post.id]: {
                                  ...prev[post.id],
                                  seoDescription: e.target.value,
                                },
                              }))
                            }
                            placeholder="Meta description"
                            {...fieldInputProps}
                          />
                          <Textarea
                            value={edit?.content ?? post.content}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [post.id]: {
                                  ...prev[post.id],
                                  content: e.target.value,
                                },
                              }))
                            }
                            rows={12}
                            placeholder="Nội dung Markdown"
                            fontFamily="mono"
                            fontSize="sm"
                            {...fieldInputProps}
                          />
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
                              onClick={() => void publish(post.id)}
                            >
                              Xuất bản
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
                          </HStack>
                        </>
                      ) : (
                        <>
                          {(edit?.coverImageUrl || post.coverImageUrl) ? (
                            <BlogBanner
                              src={resolveBlogBannerUrl(
                                edit?.coverImageUrl || post.coverImageUrl,
                              )}
                              alt={post.title}
                            />
                          ) : null}
                          <Text fontWeight="semibold">{post.title}</Text>
                          <Text fontSize="xs" color="fg.muted">
                            /posts/{post.slug}
                          </Text>
                          {post.status === "published" ? (
                            <Link asChild fontSize="sm" color="cerulean.700">
                              <NextLink
                                href={`/posts/${post.slug}`}
                                target="_blank"
                              >
                                Xem bài →
                              </NextLink>
                            </Link>
                          ) : post.rejectNote ? (
                            <Text fontSize="xs" color="red.fg">
                              {post.rejectNote}
                            </Text>
                          ) : null}
                        </>
                      )}
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
