"use client";

import { Badge } from "@chakra-ui/react";

type TagPalette =
  | "gray"
  | "green"
  | "purple"
  | "orange"
  | "red";

const TAG_META: Record<string, { label: string; colorPalette: TagPalette }> = {
  NORMAL: { label: "Thường", colorPalette: "gray" },
  FRIENDLY: { label: "Thân thiện", colorPalette: "green" },
  VIP: { label: "VIP", colorPalette: "purple" },
  UNFRIENDLY: { label: "Khó tính", colorPalette: "orange" },
  BLACKLISTED: { label: "Chặn", colorPalette: "red" },
};

export function CustomerTagBadge({ tag }: { tag: string }) {
  const meta = TAG_META[tag] ?? {
    label: tag,
    colorPalette: "gray" as const,
  };

  return (
    <Badge variant="subtle" colorPalette={meta.colorPalette} size="sm">
      {meta.label}
    </Badge>
  );
}
