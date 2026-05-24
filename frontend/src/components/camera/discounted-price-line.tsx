import { HStack, Text } from "@chakra-ui/react";

import { discountedRentalVnd } from "@/lib/rental-pricing";

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

type DiscountedPriceLineProps = {
  label: string;
  price: number;
  discountPercent: number;
};

export function DiscountedPriceLine({
  label,
  price,
  discountPercent,
}: DiscountedPriceLineProps) {
  const hasDiscount = discountPercent > 0;
  const salePrice = discountedRentalVnd(price, discountPercent);

  return (
    <Text fontSize="sm">
      {label}{" "}
      {hasDiscount ? (
        <HStack as="span" display="inline-flex" gap={1.5} align="baseline">
          <Text
            as="span"
            textDecoration="line-through"
            color="fg.muted"
            fontWeight="normal"
          >
            {vnd.format(price)}
          </Text>
          <Text as="span" fontWeight="medium">
            {vnd.format(salePrice)}
          </Text>
        </HStack>
      ) : (
        <Text as="span" fontWeight="medium">
          {vnd.format(price)}
        </Text>
      )}
    </Text>
  );
}
