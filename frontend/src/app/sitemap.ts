import type { MetadataRoute } from "next";

import { fetchPublishedBlogSlugs } from "@/lib/blog-posts";

const SITE = "https://thuemayanhlongkhanh.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE}/posts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE}/book`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  let posts: Awaited<ReturnType<typeof fetchPublishedBlogSlugs>> = [];
  try {
    posts = await fetchPublishedBlogSlugs();
  } catch {
    posts = [];
  }

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE}/posts/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...postEntries];
}
