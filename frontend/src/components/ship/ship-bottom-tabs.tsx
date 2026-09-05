"use client";

import { Box, Button, HStack } from "@chakra-ui/react";

import {
  shipDisplayStatusLabel,
  type ShipDisplayStatus,
} from "@/lib/ship-display-status";
import {
  APP_COLOR_PALETTE,
  titleColor,
  userOutlineButtonProps,
  userStickyBarProps,
} from "@/lib/user-theme";

const SHIP_TABS: ShipDisplayStatus[] = [
  "WAIT_CLAIM",
  "WAIT_DELIVER",
  "WAIT_RETURN",
];

type ShipBottomTabsProps = {
  active: ShipDisplayStatus;
  counts: Record<ShipDisplayStatus, number>;
  onChange: (tab: ShipDisplayStatus) => void;
};

export function ShipBottomTabs({
  active,
  counts,
  onChange,
}: ShipBottomTabsProps) {
  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      px={3}
      py={2}
      pb="calc(8px + env(safe-area-inset-bottom))"
      {...userStickyBarProps}
      zIndex={10}
    >
      <HStack maxW="md" mx="auto" gap={2} justify="stretch">
        {SHIP_TABS.map((tab) => {
          const isActive = tab === active;
          const count = counts[tab];
          return (
            <Button
              key={tab}
              flex={1}
              size="sm"
              fontSize="xs"
              {...(isActive
                ? { variant: "solid" as const, colorPalette: APP_COLOR_PALETTE }
                : { ...userOutlineButtonProps, color: titleColor })}
              onClick={() => onChange(tab)}
            >
              {shipDisplayStatusLabel(tab)}
              {count > 0 ? ` (${count})` : ""}
            </Button>
          );
        })}
      </HStack>
    </Box>
  );
}
