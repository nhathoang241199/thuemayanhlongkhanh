import { AspectRatio, Text } from "@chakra-ui/react";

import { youtubeEmbedUrl } from "@/lib/youtube";

type YoutubeEmbedProps = {
  url: string | null | undefined;
  title?: string;
};

export function YoutubeEmbed({ url, title = "Video hướng dẫn" }: YoutubeEmbedProps) {
  const embedSrc = youtubeEmbedUrl(url);

  if (!url?.trim()) return null;

  if (!embedSrc) {
    return (
      <Text fontSize="sm" color="fg.muted">
        Link video không hợp lệ. Dùng link YouTube dạng{" "}
        <Text as="span" fontFamily="mono" fontSize="xs">
          https://www.youtube.com/watch?v=…
        </Text>
        .
      </Text>
    );
  }

  return (
    <AspectRatio
      ratio={16 / 9}
      w="full"
      borderRadius="md"
      overflow="hidden"
      borderWidth="1px"
      borderColor="cerulean.200"
      bg="black"
    >
      <iframe
        src={embedSrc}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ border: 0, width: "100%", height: "100%" }}
      />
    </AspectRatio>
  );
}
