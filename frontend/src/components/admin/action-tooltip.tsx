"use client";

import {
  Box,
  Portal,
  TooltipContent,
  TooltipPositioner,
  TooltipRoot,
  TooltipTrigger,
} from "@chakra-ui/react";
import type { ReactNode } from "react";

export function ActionTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <TooltipRoot openDelay={200} closeDelay={50} positioning={{ placement: "top" }}>
      <TooltipTrigger asChild>
        <Box as="span" display="inline-flex">
          {children}
        </Box>
      </TooltipTrigger>
      <Portal>
        <TooltipPositioner>
          <TooltipContent fontSize="xs" px={2} py={1}>
            {label}
          </TooltipContent>
        </TooltipPositioner>
      </Portal>
    </TooltipRoot>
  );
}
