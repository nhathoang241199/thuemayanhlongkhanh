import { Button, HStack, Text } from "@chakra-ui/react";
import NextLink from "next/link";

import { BLOG_POSTS_PER_PAGE } from "@/lib/blog-posts";

type BlogPostsPaginationProps = {
  page: number;
  total: number;
};

function pageHref(page: number) {
  return page <= 1 ? "/posts" : `/posts?page=${page}`;
}

export function BlogPostsPagination({ page, total }: BlogPostsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / BLOG_POSTS_PER_PAGE));
  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const visiblePages = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, i) => windowStart + i,
  );

  return (
    <HStack justify="center" gap={2} flexWrap="wrap" pt={2}>
        {page <= 1 ? (
          <Button size="sm" variant="outline" disabled>
            ← Trước
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <NextLink href={pageHref(page - 1)}>← Trước</NextLink>
          </Button>
        )}

        {windowStart > 1 ? (
          <>
            <PageLink n={1} current={page} />
            {windowStart > 2 ? (
              <Text fontSize="sm" color="fg.muted" px={1}>
                …
              </Text>
            ) : null}
          </>
        ) : null}

        {visiblePages.map((n) => (
          <PageLink key={n} n={n} current={page} />
        ))}

        {windowEnd < totalPages ? (
          <>
            {windowEnd < totalPages - 1 ? (
              <Text fontSize="sm" color="fg.muted" px={1}>
                …
              </Text>
            ) : null}
            <PageLink n={totalPages} current={page} />
          </>
        ) : null}

        {page >= totalPages ? (
          <Button size="sm" variant="outline" disabled>
            Sau →
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <NextLink href={pageHref(page + 1)}>Sau →</NextLink>
          </Button>
        )}
    </HStack>
  );
}

function PageLink({ n, current }: { n: number; current: number }) {
  const active = n === current;
  return (
    <Button
      asChild
      size="sm"
      variant={active ? "solid" : "outline"}
      colorPalette={active ? "cyan" : undefined}
      aria-current={active ? "page" : undefined}
    >
      <NextLink href={pageHref(n)}>{n}</NextLink>
    </Button>
  );
}
