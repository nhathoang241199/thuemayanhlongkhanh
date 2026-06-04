import {
  Badge,
  Box,
  CardBody,
  CardRoot,
  HStack,
  Image,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";

import { CameraDiscountBadge } from "@/components/camera/camera-discount-badge";
import { DiscountedPriceLine } from "@/components/camera/discounted-price-line";
import { isFreeLens } from "@/lib/lens-step";
import type { RentalPickerItem } from "@/lib/booking-api";
import { titleColor, userBookingCardProps } from "@/lib/user-theme";

type CameraPickerCardProps = {
  camera: RentalPickerItem;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  unavailableLabel?: string;
  /** Lens giá 0: hiện "Miễn phí" thay vì 0đ */
  showFreePriceLabel?: boolean;
};

export function CameraPickerCard({
  camera,
  href,
  onClick,
  disabled = false,
  unavailableLabel,
  showFreePriceLabel = false,
}: CameraPickerCardProps) {
  const discountPercent = camera.discountPercent ?? 0;
  const freePrice =
    showFreePriceLabel && isFreeLens(camera);

  const body = (
    <CardBody position="relative">
      {discountPercent > 0 ? (
        <Box position="absolute" top={3} right={3} zIndex={1}>
          <CameraDiscountBadge discountPercent={discountPercent} />
        </Box>
      ) : null}
      <Stack gap={3}>
        <Box
          borderRadius="md"
          overflow="hidden"
          h="190px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {camera.imageUrl ? (
            <Image
              src={camera.imageUrl}
              alt={camera.name}
              objectFit="contain"
              w="full"
              h="full"
            />
          ) : (
            <Text fontSize="sm" color="fg.muted">
              Chưa có ảnh
            </Text>
          )}
        </Box>
        <Stack gap={1}>
          <HStack gap={2} align="center" flexWrap="wrap">
            <Text fontWeight="semibold" color={titleColor}>
              {camera.name}
              {unavailableLabel ? (
                <Text as="span" color="red.fg" fontWeight="medium" ml={1}>
                  ({unavailableLabel})
                </Text>
              ) : null}
            </Text>
          </HStack>
          {freePrice ? (
            <Text fontSize="sm" fontWeight="medium" color="fg.muted">
              Miễn phí
            </Text>
          ) : (
            <>
              <DiscountedPriceLine
                label="Cả ngày:"
                price={camera.dayPrice}
                discountPercent={discountPercent}
              />
              <DiscountedPriceLine
                label="Theo buổi:"
                price={camera.shiftPrice}
                discountPercent={discountPercent}
              />
            </>
          )}
        </Stack>
      </Stack>
    </CardBody>
  );

  const cardProps = {
    ...userBookingCardProps,
    bg: "white",
    opacity: disabled ? 0.55 : 1,
    pointerEvents: disabled ? ("none" as const) : undefined,
    _hover: disabled ? undefined : { borderColor: "cerulean.300" },
  };

  if (href && !disabled) {
    return (
      <CardRoot {...cardProps} asChild cursor="pointer">
        <NextLink href={href}>{body}</NextLink>
      </CardRoot>
    );
  }

  return (
    <CardRoot
      {...cardProps}
      cursor={disabled ? "not-allowed" : onClick ? "pointer" : undefined}
      onClick={disabled ? undefined : onClick}
    >
      {body}
    </CardRoot>
  );
}
