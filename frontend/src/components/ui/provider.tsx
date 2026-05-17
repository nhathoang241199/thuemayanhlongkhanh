"use client";

import {
  Box,
  ChakraProvider,
  Toast,
  Toaster,
  createSystem,
  defaultConfig,
  defineConfig,
} from "@chakra-ui/react";

import { toaster } from "@/lib/toaster";

const paletteSemantic = (
  name: string,
  solid: string,
  fg: string,
  subtle: string,
  muted: string,
  emphasized: string,
  focusRing: string,
  border: string,
) => ({
  contrast: { value: { _light: "white", _dark: "white" } },
  fg: {
    value: { _light: `{colors.${name}.${fg}}`, _dark: `{colors.${name}.200}` },
  },
  subtle: {
    value: {
      _light: `{colors.${name}.${subtle}}`,
      _dark: `{colors.${name}.900}`,
    },
  },
  muted: {
    value: {
      _light: `{colors.${name}.${muted}}`,
      _dark: `{colors.${name}.800}`,
    },
  },
  emphasized: {
    value: {
      _light: `{colors.${name}.${emphasized}}`,
      _dark: `{colors.${name}.700}`,
    },
  },
  solid: {
    value: {
      _light: `{colors.${name}.${solid}}`,
      _dark: `{colors.${name}.${solid}}`,
    },
  },
  focusRing: {
    value: {
      _light: `{colors.${name}.${focusRing}}`,
      _dark: `{colors.${name}.${focusRing}}`,
    },
  },
  border: {
    value: {
      _light: `{colors.${name}.${border}}`,
      _dark: `{colors.${name}.400}`,
    },
  },
});

const appTheme = defineConfig({
  theme: {
    tokens: {
      colors: {
        ocean: {
          50: { value: "#f0f4f8" },
          100: { value: "#e2eaf2" },
          200: { value: "#c5d4e8" },
          300: { value: "#a8bdd4" },
          400: { value: "#6b8fb8" },
          500: { value: "#2563eb" },
          600: { value: "#2563eb" },
          700: { value: "#2a4d73" },
          800: { value: "#1e3a5f" },
          900: { value: "#152a45" },
          950: { value: "#0f1f33" },
        },
        cerulean: {
          25: { value: "#f7fcff" },
          50: { value: "#f0f9ff" },
          100: { value: "#e0f2fe" },
          200: { value: "#bae6fd" },
          300: { value: "#7dd3fc" },
          400: { value: "#38bdf8" },
          500: { value: "#0ea5e9" },
          600: { value: "#0284c7" },
          700: { value: "#0369a1" },
          800: { value: "#0c4a6e" },
          900: { value: "#082f49" },
          950: { value: "#0c1e2e" },
        },
      },
    },
    semanticTokens: {
      colors: {
        ocean: paletteSemantic(
          "ocean",
          "600",
          "800",
          "100",
          "200",
          "300",
          "500",
          "200",
        ),
        cerulean: paletteSemantic(
          "cerulean",
          "600",
          "800",
          "100",
          "200",
          "300",
          "500",
          "300",
        ),
      },
    },
  },
});

const system = createSystem(defaultConfig, appTheme, {
  globalCss: {
    body: {
      bg: "gray.50",
      color: "fg",
    },
  },
});

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <Box minH="100dvh">{children}</Box>
      <Toaster toaster={toaster}>
        {(t) => (
          <Toast.Root w="100%" minW="16rem" maxW="min(92vw, 36rem)">
            <Toast.Indicator />
            <Box flex="1" minW={0}>
              {t.title ? <Toast.Title>{t.title}</Toast.Title> : null}
              {t.description ? (
                <Toast.Description>{t.description}</Toast.Description>
              ) : null}
            </Box>
            <Toast.CloseTrigger />
          </Toast.Root>
        )}
      </Toaster>
    </ChakraProvider>
  );
}
