"use client";

import {
  Box,
  CardBody,
  CardRoot,
  Grid,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { ReactNode } from "react";

import { adminMobileCardProps } from "./admin-theme";

type AdminDataCardProps = {
  children: ReactNode;
  onClick?: () => void;
  cursor?: string;
  hoverBg?: string;
};

export function AdminDataCard({
  children,
  onClick,
  cursor,
  hoverBg,
}: AdminDataCardProps) {
  return (
    <CardRoot
      {...adminMobileCardProps}
      cursor={cursor}
      _hover={hoverBg ? { bg: hoverBg } : undefined}
      onClick={onClick}
    >
      <CardBody py={3} px={3}>
        <Stack gap={2}>{children}</Stack>
      </CardBody>
    </CardRoot>
  );
}

export function AdminDataCardHeader({ children }: { children: ReactNode }) {
  return (
    <Box pb={1} borderBottomWidth="1px" borderColor="ocean.200">
      {children}
    </Box>
  );
}

type AdminDataCardRowProps = {
  label: string;
  children: ReactNode;
  align?: "start" | "center";
};

export function AdminDataCardRow({
  label,
  children,
  align = "start",
}: AdminDataCardRowProps) {
  return (
    <Grid
      templateColumns="6.5rem 1fr"
      gap={2}
      alignItems={align}
      w="full"
    >
      <Text fontSize="xs" color="fg.muted" fontWeight="medium">
        {label}
      </Text>
      <Box fontSize="sm" minW={0}>
        {children}
      </Box>
    </Grid>
  );
}

export function AdminDataCardActions({
  children,
  justify = "flex-start",
}: {
  children: ReactNode;
  justify?: "flex-start" | "flex-end" | "center" | "space-between";
}) {
  return (
    <HStack
      gap={2}
      flexWrap="wrap"
      justify={justify}
      pt={2}
      mt={1}
      borderTopWidth="1px"
      borderColor="ocean.200"
      w="full"
    >
      {children}
    </HStack>
  );
}
