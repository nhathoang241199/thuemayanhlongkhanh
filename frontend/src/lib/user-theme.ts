/**
 * Khách hàng: Cerulean
 * Nền #f0f9ff · Primary #0284c7 · Text #0c4a6e
 */
export const USER_COLOR_PALETTE = "cerulean" as const;

export const APP_COLOR_PALETTE = USER_COLOR_PALETTE;

export const userPageBg = "cerulean.50";

/** Card nội dung — nền xanh nhạt hơn userPageBg (cerulean.50) */
export const userCardProps = {
  bg: "cerulean.25",
  borderWidth: "1px",
  borderColor: "cerulean.200",
  colorPalette: USER_COLOR_PALETTE,
  shadow: "sm" as const,
};

/** Card đơn trên trang chủ (cùng style card user) */
export const userBookingCardProps = {
  ...userCardProps,
};

/** Nút chọn hãng / máy / tiếp tục bước ngày */
export const userSolidButtonProps = {
  variant: "solid" as const,
  colorPalette: USER_COLOR_PALETTE,
};

/** Nút outline — nền xanh nhạt hơn userPageBg (cerulean.50) */
export const userOutlineButtonProps = {
  variant: "outline" as const,
  colorPalette: USER_COLOR_PALETTE,
  bg: "cerulean.25",
  borderColor: "cerulean.300",
  _hover: { bg: "cerulean.100" },
  _active: { bg: "cerulean.100" },
};

export const userFieldInputProps = {
  bg: "white",
  borderWidth: "1px",
  borderColor: "cerulean.300",
  _focusVisible: {
    borderColor: "cerulean.600",
    boxShadow: "0 0 0 1px var(--chakra-colors-cerulean-600)",
  },
};

export const titleColor = "cerulean.800";
export const mutedAccentColor = "cerulean.700";

export const userStickyBarProps = {
  bg: "cerulean.50",
  borderTopWidth: "1px",
  borderColor: "cerulean.300",
};

/** Lưu ý quan trọng (vd. sạc pin) — nền vàng nhạt */
export const userWarningNoteProps = {
  bg: "yellow.50",
  borderWidth: "1px",
  borderColor: "yellow.200",
  borderRadius: "md",
  px: 3,
  py: 2,
  w: "full",
} as const;

export const userWarningNoteTextProps = {
  fontSize: "xs",
  lineHeight: "tall",
  color: "yellow.900",
} as const;
