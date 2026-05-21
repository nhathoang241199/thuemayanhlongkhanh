"use client";

import { Button, HStack } from "@chakra-ui/react";
import NextLink from "next/link";

import { APP_COLOR_PALETTE, userOutlineButtonProps } from "@/lib/user-theme";

type BookStepFooterProps = {
  onBack: () => void;
  backLabel?: string;
};

export function BookStepFooter({
  onBack,
  backLabel = "Quay lại",
}: BookStepFooterProps) {
  return (
    <HStack w="full" justify="space-between" gap={3} pt={2}>
      <Button
        type="button"
        variant="outline"
        {...userOutlineButtonProps}
        onClick={onBack}
      >
        {backLabel}
      </Button>
      <Button
        asChild
        type="button"
        variant="outline"
        colorPalette={APP_COLOR_PALETTE}
        bg="cerulean.25"
        borderColor="cerulean.300"
        _hover={{ bg: "cerulean.100" }}
      >
        <NextLink href="/home">Trang chủ</NextLink>
      </Button>
    </HStack>
  );
}
