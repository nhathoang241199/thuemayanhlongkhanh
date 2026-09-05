import {
  Box,
  Container,
  Heading,
  Link,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import type { Metadata } from "next";

import { BlogPostsPagination } from "@/components/blog/blog-posts-pagination";
import {
  BLOG_POSTS_PER_PAGE,
  fetchPublishedBlogPosts,
  formatBlogDate,
} from "@/lib/blog-posts";
import { BlogBanner } from "@/components/blog/blog-banner";
import { resolveBlogBannerUrl } from "@/lib/blog-banner-upload";
import { getSiteTitle } from "@/lib/site-config";
import { userPageBg } from "@/lib/user-theme";

export const metadata: Metadata = {
  title: `Blog thuê máy ảnh | ${getSiteTitle()}`,
  description:
    "Mẹo chọn máy ảnh, kinh nghiệm thuê thiết bị chụp ảnh tại Long Khánh — Thuê máy ảnh Long Khánh.",
};

type Props = {
  searchParams: Promise<{ page?: string }>;
};

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export default async function PostsPage({ searchParams }: Props) {
  const siteTitle = getSiteTitle();
  const { page: pageRaw } = await searchParams;
  const requestedPage = parsePage(pageRaw);

  let posts: Awaited<ReturnType<typeof fetchPublishedBlogPosts>>["items"] = [];
  let total = 0;
  let page = requestedPage;
  let loadError = false;

  try {
    const offset = (requestedPage - 1) * BLOG_POSTS_PER_PAGE;
    const data = await fetchPublishedBlogPosts(BLOG_POSTS_PER_PAGE, offset);
    posts = data.items;
    total = data.total;

    const totalPages = Math.max(1, Math.ceil(total / BLOG_POSTS_PER_PAGE));
    if (requestedPage > totalPages && total > 0) {
      page = totalPages;
      const retry = await fetchPublishedBlogPosts(
        BLOG_POSTS_PER_PAGE,
        (page - 1) * BLOG_POSTS_PER_PAGE,
      );
      posts = retry.items;
    }
  } catch {
    loadError = true;
  }

  return (
    <Box minH="100dvh" bg={userPageBg} py={{ base: 6, md: 10 }}>
      <Container maxW="6xl" px={4}>
        <Stack gap={6}>
          <Stack gap={1}>
            <Heading as="h1" size="xl" color="cerulean.900">
              Blog thuê máy ảnh
            </Heading>
            <Text fontSize="sm" color="fg.muted">
              {siteTitle} · Mẹo & kinh nghiệm chụp ảnh tại Long Khánh
            </Text>
          </Stack>

          {loadError ? (
            <Text color="fg.muted">Không tải được danh sách bài viết.</Text>
          ) : posts.length === 0 ? (
            <Text color="fg.muted">Chưa có bài viết nào.</Text>
          ) : (
            <>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={5}>
                {posts.map((post) => (
                  <Box
                    key={post.slug}
                    borderWidth="1px"
                    borderColor="border.muted"
                    rounded="lg"
                    overflow="hidden"
                    bg="white"
                    h="full"
                    display="flex"
                    flexDirection="column"
                    shadow="sm"
                    transition="shadow 0.2s"
                    _hover={{ shadow: "md" }}
                  >
                    {post.coverImageUrl ? (
                      <Link asChild display="block" flexShrink={0}>
                        <NextLink href={`/posts/${post.slug}`}>
                          <BlogBanner
                            src={resolveBlogBannerUrl(post.coverImageUrl)}
                            alt={post.title}
                          />
                        </NextLink>
                      </Link>
                    ) : (
                      <Box h="10rem" bg="cerulean.100" flexShrink={0} />
                    )}
                    <Stack gap={2} p={4} flex="1">
                      <Heading as="h2" size="sm" lineClamp={2}>
                        <Link asChild color="cerulean.800">
                          <NextLink href={`/posts/${post.slug}`}>
                            {post.title}
                          </NextLink>
                        </Link>
                      </Heading>
                      {post.publishedAt ? (
                        <Text fontSize="xs" color="fg.muted">
                          {formatBlogDate(post.publishedAt)}
                        </Text>
                      ) : null}
                      {post.excerpt ? (
                        <Text
                          fontSize="sm"
                          lineHeight="tall"
                          color="fg.muted"
                          lineClamp={3}
                          flex="1"
                        >
                          {post.excerpt}
                        </Text>
                      ) : null}
                      <Link
                        asChild
                        fontSize="sm"
                        color="cerulean.700"
                        fontWeight="medium"
                        mt="auto"
                      >
                        <NextLink href={`/posts/${post.slug}`}>
                          Đọc tiếp →
                        </NextLink>
                      </Link>
                    </Stack>
                  </Box>
                ))}
              </SimpleGrid>
              <BlogPostsPagination page={page} total={total} />
            </>
          )}

          <Text fontSize="sm" color="fg.muted" pt={2}>
            <Link asChild color="cerulean.700">
              <NextLink href="/">← Về trang chủ</NextLink>
            </Link>
            {" · "}
            <Link asChild color="cerulean.700">
              <NextLink href="/book">Đặt lịch thuê máy</NextLink>
            </Link>
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
