"use client";

import { Box } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function BlogMarkdown({ content }: { content: string }) {
  return (
    <Box
      className="blog-markdown"
      css={{
        "& h2": {
          fontSize: "1.25rem",
          fontWeight: "semibold",
          color: "var(--chakra-colors-cerulean-800)",
          mt: 6,
          mb: 2,
        },
        "& h3": {
          fontSize: "1.1rem",
          fontWeight: "semibold",
          color: "var(--chakra-colors-cerulean-800)",
          mt: 4,
          mb: 2,
        },
        "& p": {
          lineHeight: "tall",
          mb: 3,
        },
        "& ul, & ol": {
          ps: 5,
          mb: 3,
          lineHeight: "tall",
        },
        "& li": {
          mb: 1,
        },
        "& a": {
          color: "var(--chakra-colors-cerulean-700)",
          textDecoration: "underline",
        },
        "& strong": {
          fontWeight: "semibold",
        },
        "& blockquote": {
          borderLeftWidth: "3px",
          borderColor: "cerulean.300",
          pl: 4,
          color: "fg.muted",
          fontStyle: "italic",
          my: 4,
        },
        "& img": {
          maxW: "100%",
          borderRadius: "md",
          my: 4,
        },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Box>
  );
}
