"use client";

import { Box, Image, Skeleton } from "@chakra-ui/react";
import { useEffect, useState } from "react";

const QR_IMAGE_SIZE = 280;
const QR_BOX_PADDING = 12;
const QR_BOX_MAX_W = QR_IMAGE_SIZE + QR_BOX_PADDING * 2;

export function QrCodeCard({ imageUrl }: { imageUrl: string }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [imageUrl]);

  return (
    <Box
      mx="auto"
      p={3}
      bg="white"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="cerulean.200"
      w="full"
      maxW={`${QR_BOX_MAX_W}px`}
      boxSizing="border-box"
    >
      <Box
        position="relative"
        w={`${QR_IMAGE_SIZE}px`}
        h={`${QR_IMAGE_SIZE}px`}
        maxW="100%"
        mx="auto"
      >
        {!loaded ? (
          <Skeleton
            position="absolute"
            inset={0}
            w="full"
            h="full"
            borderRadius="md"
          />
        ) : null}
        <Image
          src={imageUrl}
          alt="Mã QR chuyển khoản"
          position="absolute"
          inset={0}
          w="full"
          h="full"
          objectFit="contain"
          opacity={loaded ? 1 : 0}
          transition="opacity 0.2s"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
        />
      </Box>
    </Box>
  );
}
