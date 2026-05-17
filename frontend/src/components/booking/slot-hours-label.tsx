import { Grid, HStack, Text, type TextProps } from "@chakra-ui/react";

import { slotLabelVi, slotTimeRangeLabel } from "@/lib/booking-status";

const hoursTextProps: TextProps = {
  fontSize: "xs",
  fontWeight: "normal",
  lineHeight: "short",
  opacity: 0.72,
};

type SlotHoursLabelProps = {
  slot: string;
  /** Nút ca: giờ bên phải, căn giữa dọc; dòng text: giờ căn phải cùng hàng */
  variant?: "overlay" | "inline";
};

/** Tên ca + khung giờ (không dùng ngoặc). */
export function SlotHoursLabel({
  slot,
  variant = "overlay",
}: SlotHoursLabelProps) {
  const name = slotLabelVi(slot);
  const hours = slotTimeRangeLabel(slot);

  if (!hours) {
    return <>{name}</>;
  }

  if (variant === "inline") {
    return (
      <HStack justify="space-between" align="center" w="full" gap={2}>
        <Text as="span">{name}</Text>
        <Text as="span" {...hoursTextProps} whiteSpace="nowrap">
          {hours}
        </Text>
      </HStack>
    );
  }

  return (
    <Grid
      w="full"
      templateColumns="1fr auto 1fr"
      alignItems="center"
      columnGap={2}
    >
      <span aria-hidden />
      <Text as="span" textAlign="center">
        {name}
      </Text>
      <Text as="span" justifySelf="end" whiteSpace="nowrap" {...hoursTextProps}>
        {hours}
      </Text>
    </Grid>
  );
}
