import { Button, Image } from "@chakra-ui/react";

import type { BrandOption } from "@/lib/camera-brands";
import { userOutlineButtonProps } from "@/lib/user-theme";

type BrandPickerButtonProps = {
  brand: BrandOption;
  onClick: () => void;
};

export function BrandPickerButton({ brand, onClick }: BrandPickerButtonProps) {
  return (
    <Button
      size="lg"
      w="full"
      h="5.75rem"
      py={3}
      {...userOutlineButtonProps}
      bg="white"
      onClick={onClick}
      aria-label={brand.label}
    >
      <Image
        src={brand.logoSrc}
        alt={brand.label}
        h={brand.logoHeight}
        w="auto"
        maxW="min(100%, 14rem)"
        objectFit="contain"
        objectPosition="center"
      />
    </Button>
  );
}
