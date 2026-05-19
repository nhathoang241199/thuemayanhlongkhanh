"use client";

import { Box, Stack } from "@chakra-ui/react";
import type { ReactNode } from "react";

type Breakpoint = "sm" | "md" | "lg" | "xl";

type AdminResponsiveTableProps = {
  table: ReactNode;
  cards: ReactNode;
  /** Breakpoint từ đó hiển thị bảng (mặc định md) */
  breakpoint?: Breakpoint;
};

function tableDisplay(bp: Breakpoint): Record<string, string> {
  return { base: "none", [bp]: "block" };
}

function cardsDisplay(bp: Breakpoint): Record<string, string> {
  return { base: "flex", [bp]: "none" };
}

export function AdminResponsiveTable({
  table,
  cards,
  breakpoint = "md",
}: AdminResponsiveTableProps) {
  return (
    <>
      <Box display={tableDisplay(breakpoint)}>{table}</Box>
      <Stack
        display={cardsDisplay(breakpoint)}
        flexDirection="column"
        gap={3}
        p={{ base: 3, [breakpoint]: 0 }}
      >
        {cards}
      </Stack>
    </>
  );
}
