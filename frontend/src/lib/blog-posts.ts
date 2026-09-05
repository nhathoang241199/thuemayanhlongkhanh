import { apiBase } from "./api-base";

export type BlogPostListItem = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type BlogPostDetail = BlogPostListItem & {
  content: string;
  seoDescription: string | null;
};

export type BlogPostAdmin = BlogPostDetail & {
  id: string;
  status: "pending" | "published" | "rejected";
  source: string;
  rejectNote: string | null;
  createdAt: string;
};

export const BLOG_POSTS_PER_PAGE = 9;

export async function fetchPublishedBlogPosts(
  limit = BLOG_POSTS_PER_PAGE,
  offset = 0,
) {
  const res = await fetch(
    `${apiBase()}/api/blog-posts/public?limit=${limit}&offset=${offset}`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) {
    throw new Error(`Blog list failed: ${res.status}`);
  }
  return res.json() as Promise<{
    items: BlogPostListItem[];
    total: number;
    limit: number;
    offset: number;
  }>;
}

export async function fetchBlogPostBySlug(slug: string) {
  const res = await fetch(`${apiBase()}/api/blog-posts/public/${slug}`, {
    next: { revalidate: 300 },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Blog post failed: ${res.status}`);
  }
  return res.json() as Promise<BlogPostDetail>;
}

export async function fetchPublishedBlogSlugs() {
  const res = await fetch(`${apiBase()}/api/blog-posts/public/slugs`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json() as Promise<{ slug: string; updatedAt: string }[]>;
}

export function formatBlogDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
