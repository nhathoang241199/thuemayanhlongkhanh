import { apiBase } from "./api-base";
import { throwIfNotOk } from "./admin-api";

export async function uploadBlogBanner(postId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${apiBase()}/api/blog-posts/${postId}/banner`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  await throwIfNotOk(res, "Lỗi upload banner");
  return res.json() as Promise<{ coverImageUrl: string }>;
}

export function resolveBlogBannerUrl(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return trimmed;
}
