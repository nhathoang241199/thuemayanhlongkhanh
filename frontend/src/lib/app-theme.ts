/**
 * Admin: Ocean / Navy
 * Nền #f0f4f8 · Primary #1e3a5f · CTA #2563eb · Viền #c5d4e8
 */
export const ADMIN_COLOR_PALETTE = "ocean" as const;

/** Alias dùng trong trang admin */
export const APP_COLOR_PALETTE = ADMIN_COLOR_PALETTE;

export const adminPageBg = "ocean.50";
export const adminShellBg = "ocean.100";

export const cardSurfaceProps = {
  bg: "ocean.50",
  borderWidth: "1px",
  borderColor: "ocean.200",
  colorPalette: ADMIN_COLOR_PALETTE,
};

export const fieldInputProps = {
  bg: "white",
  borderWidth: "1px",
  borderColor: "ocean.200",
  _focusVisible: {
    borderColor: "ocean.500",
    boxShadow: "0 0 0 1px var(--chakra-colors-ocean-500)",
  },
};

export const titleColor = "ocean.800";
export const mutedAccentColor = "ocean.700";
export const accentColor = "ocean.500";
