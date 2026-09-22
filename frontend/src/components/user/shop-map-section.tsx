"use client";

import { AspectRatio, Stack, Text } from "@chakra-ui/react";

import {
  googleMapsEmbedSrc,
  type PublicShopInfo,
} from "@/lib/shop-info";

type ShopMapSectionProps = {
  shopInfo: PublicShopInfo | null;
};

/** Bản đồ — dùng trong card Liên hệ shop. */
export function ShopMapSection({ shopInfo }: ShopMapSectionProps) {
  const address = shopInfo?.address?.trim() ?? "";
  const embedSrc = googleMapsEmbedSrc(shopInfo);

  if (!embedSrc && !address) return null;

  return (
    <Stack gap={2} align="stretch" pt={1}>
      {address ? (
        <Text fontSize="sm" color="fg.muted" lineHeight="tall">
          {address}
        </Text>
      ) : null}
      {embedSrc ? (
        <AspectRatio
          ratio={16 / 9}
          w="full"
          borderRadius="md"
          overflow="hidden"
          borderWidth="1px"
          borderColor="cerulean.200"
          bg="cerulean.50"
        >
          <iframe
            src={embedSrc}
            title="Bản đồ cửa hàng"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            style={{ border: 0, width: "100%", height: "100%" }}
          />
        </AspectRatio>
      ) : null}
    </Stack>
  );
}
