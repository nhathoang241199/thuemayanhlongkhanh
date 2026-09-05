import {
  Box,
  Container,
  Heading,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogMarkdown } from "@/components/blog/blog-markdown";
import { BlogBanner } from "@/components/blog/blog-banner";
import {
  fetchBlogPostBySlug,
  formatBlogDate,
} from "@/lib/blog-posts";
import { resolveBlogBannerUrl } from "@/lib/blog-banner-upload";
import { getSiteTitle } from "@/lib/site-config";
import { userPageBg } from "@/lib/user-theme";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogPostBySlug(slug);
  if (!post) {
    return { title: `Không tìm thấy | ${getSiteTitle()}` };
  }
  return {
    title: `${post.title} | ${getSiteTitle()}`,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.seoDescription ?? post.excerpt ?? undefined,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <Box minH="100dvh" bg={userPageBg} py={{ base: 6, md: 10 }}>
      <Container maxW="2xl" px={4}>
        <Stack gap={6}>
          {post.coverImageUrl ? (
            <BlogBanner
              src={resolveBlogBannerUrl(post.coverImageUrl)}
              alt={post.title}
              variant="hero"
            />
          ) : null}
          <Stack gap={2}>
            <Heading as="h1" size="xl" color="cerulean.900">
              {post.title}
            </Heading>
            {post.publishedAt ? (
              <Text fontSize="sm" color="fg.muted">
                {formatBlogDate(post.publishedAt)}
              </Text>
            ) : null}
            {post.excerpt ? (
              <Text fontSize="md" color="fg.muted" lineHeight="tall">
                {post.excerpt}
              </Text>
            ) : null}
          </Stack>

          <BlogMarkdown content={post.content} />

          <Stack gap={2} pt={4} borderTopWidth="1px" borderColor="border.muted">
            <Text fontSize="sm" color="fg.muted">
              Cần thuê máy ảnh tại Long Khánh?{" "}
              <Link asChild color="cerulean.700" fontWeight="medium">
                <NextLink href="/book">Đặt lịch online</NextLink>
              </Link>
            </Text>
            <Text fontSize="sm" color="fg.muted">
              <Link asChild color="cerulean.700">
                <NextLink href="/posts">← Tất cả bài viết</NextLink>
              </Link>
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
