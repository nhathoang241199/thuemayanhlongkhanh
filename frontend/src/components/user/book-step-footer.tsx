"use client";

import { Button, HStack } from "@chakra-ui/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import NextLink from "next/link";

import { userOutlineButtonProps } from "@/lib/user-theme";

const edgeEase = [0.22, 1, 0.36, 1] as const;

type StepEdgeFadeProps = {
  side: "left" | "right";
  stepKey: number;
  children: React.ReactNode;
};

/** Mờ và trượt về phía nút hoặc tiêu đề đang đứng, rồi hiện lại từ phía đó. */
export function StepEdgeFade({ side, stepKey, children }: StepEdgeFadeProps) {
  const reduceMotion = useReducedMotion();
  const shift = side === "right" ? 20 : -20;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={reduceMotion ? false : { opacity: 0, x: shift }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, x: shift }}
        transition={{ duration: 0.4, ease: edgeEase }}
        style={{ width: "fit-content", flexShrink: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

type BookStepFooterProps = {
  onBack: () => void;
  backLabel?: string;
  /** Đổi giá trị này để nút mờ đi rồi hiện lại khi sang bước khác. */
  stepKey?: number;
};

export function BookStepFooter({
  onBack,
  backLabel = "Quay lại",
  stepKey,
}: BookStepFooterProps) {
  const backButton = (
    <Button type="button" {...userOutlineButtonProps} onClick={onBack}>
      {backLabel}
    </Button>
  );
  const homeButton = (
    <Button asChild type="button" {...userOutlineButtonProps}>
      <NextLink href="/home">Trang chủ</NextLink>
    </Button>
  );

  return (
    <HStack w="full" justify="space-between" gap={3} pt={2}>
      {stepKey == null ? (
        backButton
      ) : (
        <StepEdgeFade side="left" stepKey={stepKey}>
          {backButton}
        </StepEdgeFade>
      )}
      {stepKey == null ? (
        homeButton
      ) : (
        <StepEdgeFade side="right" stepKey={stepKey}>
          {homeButton}
        </StepEdgeFade>
      )}
    </HStack>
  );
}
