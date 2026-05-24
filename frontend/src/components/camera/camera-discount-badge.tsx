import { Badge } from "@chakra-ui/react";

export function CameraDiscountBadge({
  discountPercent,
}: {
  discountPercent: number;
}) {
  if (discountPercent <= 0) return null;
  return (
    <Badge variant="solid" colorPalette="red" fontSize="xs">
      -{discountPercent}%
    </Badge>
  );
}
