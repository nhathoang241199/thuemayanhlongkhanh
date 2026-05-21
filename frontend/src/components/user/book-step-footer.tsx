"use client";

import { Button, HStack } from "@chakra-ui/react";
import NextLink from "next/link";

import { userOutlineButtonProps } from "@/lib/user-theme";

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
      <Button type="button" {...userOutlineButtonProps} onClick={onBack}>
        {backLabel}
      </Button>
      <Button asChild type="button" {...userOutlineButtonProps}>
        <NextLink href="/home">Trang chủ</NextLink>
      </Button>
    </HStack>
  );
}
