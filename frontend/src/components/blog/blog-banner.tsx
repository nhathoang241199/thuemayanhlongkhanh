import { Box } from "@chakra-ui/react";

type BlogBannerProps = {
  src: string;
  alt: string;
  variant?: "card" | "hero";
};

export function BlogBanner({ src, alt, variant = "card" }: BlogBannerProps) {
  const height = variant === "hero" ? { base: "12rem", md: "16rem" } : "10rem";

  return (
    <Box
      position="relative"
      w="full"
      h={height}
      overflow="hidden"
      rounded={variant === "hero" ? "lg" : "md"}
      bg="cerulean.100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </Box>
  );
}
