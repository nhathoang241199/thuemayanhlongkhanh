"use client";

import {
  AspectRatio,
  CardBody,
  CardRoot,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  googleMapsEmbedSrc,
  resolveShopMapUrl,
  type PublicShopInfo,
} from "@/lib/shop-info";
import {
  mutedAccentColor,
  titleColor,
  userBookingCardProps,
} from "@/lib/user-theme";

type ShopMapSectionProps = {
  shopInfo: PublicShopInfo | null;
};

export function ShopMapSection({ shopInfo }: ShopMapSectionProps) {
  const address = shopInfo?.address?.trim() ?? "";
  const mapUrl = resolveShopMapUrl(shopInfo);
  const embedSrc = googleMapsEmbedSrc(shopInfo);

  if (!embedSrc && !mapUrl && !address) return null;

  return (
    <CardRoot {...userBookingCardProps}>
      <CardBody py={3}>
        <Stack gap={2} align="stretch">
          <Text fontWeight="semibold" color={titleColor} fontSize="sm">
            Bản đồ
          </Text>
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
          {mapUrl ? (
            <Link
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              w="fit-content"
              fontSize="sm"
              color={mutedAccentColor}
              textDecoration="underline"
            >
              Mở Google Maps
            </Link>
          ) : null}
        </Stack>
      </CardBody>
    </CardRoot>
  );
}
