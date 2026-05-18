"use client";

import {
  Box,
  IconButton,
  Image,
  Link,
  SimpleGrid,
  Spinner,
  Text,
} from "@chakra-ui/react";

import { APP_COLOR_PALETTE } from "@/lib/app-theme";
import { useEffect, useRef, useState } from "react";

function VerificationImageTile({
  url,
  index,
  onDelete,
  deleting,
}: {
  url: string;
  index: number;
  onDelete?: (url: string) => void;
  deleting?: boolean;
}) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDisplaySrc(null);
    setImageReady(false);
    setImageError(false);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    void (async () => {
      try {
        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        blobUrlRef.current = objectUrl;
        setDisplaySrc(objectUrl);
      } catch {
        if (cancelled) return;
        setDisplaySrc(url);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [url]);

  return (
    <Box position="relative" w="full">
      {onDelete ? (
        <IconButton
          type="button"
          aria-label={`Xóa ảnh ${index + 1}`}
          size="xs"
          variant="solid"
          colorPalette="red"
          position="absolute"
          top={1.5}
          right={1.5}
          zIndex={2}
          loading={deleting}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(url);
          }}
        >
          ×
        </IconButton>
      ) : null}
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        display="block"
        borderRadius="md"
        outline="none"
        _focusVisible={{ shadow: "outline" }}
      >
        <Box
          position="relative"
          w="full"
          aspectRatio={1}
          borderRadius="md"
          overflow="hidden"
          borderWidth="1px"
          borderColor="ocean.200"
          bg="ocean.100"
        >
        {displaySrc && !imageError ? (
          <Image
            src={displaySrc}
            alt={`Minh chứng ${index + 1}`}
            w="full"
            h="full"
            objectFit="cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onLoad={() => setImageReady(true)}
            onError={() => setImageError(true)}
          />
        ) : null}

        {!imageError && (!displaySrc || !imageReady) ? (
          <Box
            position="absolute"
            inset={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="blackAlpha.200"
            pointerEvents="none"
          >
            <Spinner size="md" colorPalette={APP_COLOR_PALETTE} />
          </Box>
        ) : null}

        {imageError ? (
          <Box
            position="absolute"
            inset={0}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap={2}
            p={3}
            bg="ocean.50"
            textAlign="center"
          >
            <Text fontSize="xs" color="fg.muted">
              Không hiển thị được ảnh
            </Text>
            <Text fontSize="xs" colorPalette={APP_COLOR_PALETTE} fontWeight="medium">
              Nhấn để mở URL
            </Text>
          </Box>
        ) : null}
        </Box>
      </Link>
    </Box>
  );
}

export function VerificationImageGallery({
  urls,
  onDeleteUrl,
  deletingUrl,
}: {
  urls: string[];
  onDeleteUrl?: (url: string) => void;
  deletingUrl?: string | null;
}) {
  if (urls.length === 0) return null;

  return (
    <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap={3}>
      {urls.map((url, i) => (
        <VerificationImageTile
          key={`${url}-${i}`}
          url={url}
          index={i}
          onDelete={onDeleteUrl}
          deleting={deletingUrl === url}
        />
      ))}
    </SimpleGrid>
  );
}
