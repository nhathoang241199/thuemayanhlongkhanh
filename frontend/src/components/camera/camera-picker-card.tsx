import {
  Box,
  CardBody,
  CardRoot,
  Image,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";

import type { PublicCamera } from "@/lib/booking-api";
import { titleColor, userBookingCardProps } from "@/lib/user-theme";

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

type CameraPickerCardProps = {
  camera: PublicCamera;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  unavailableLabel?: string;
};

export function CameraPickerCard({
  camera,
  href,
  onClick,
  disabled = false,
  unavailableLabel,
}: CameraPickerCardProps) {
  const body = (
    <CardBody>
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
          <Text fontWeight="semibold" color={titleColor}>
            {camera.name}
            {unavailableLabel ? (
              <Text as="span" color="red.fg" fontWeight="medium" ml={1}>
                ({unavailableLabel})
              </Text>
            ) : null}
          </Text>
          <Text fontSize="sm">
            Cả ngày:{" "}
            <Text as="span" fontWeight="medium">
              {vnd.format(camera.dayPrice)}
            </Text>
          </Text>
          <Text fontSize="sm">
            Theo buổi:{" "}
            <Text as="span" fontWeight="medium">
              {vnd.format(camera.shiftPrice)}
            </Text>
          </Text>
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
