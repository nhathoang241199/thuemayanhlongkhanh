/** Chuẩn hóa URL YouTube (thêm https nếu thiếu). */
function normalizeYoutubeInput(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

/** Trích video ID từ watch / youtu.be / embed / shorts. */
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const normalized = normalizeYoutubeInput(url);

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id && id.length >= 6 ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.slice("/embed/".length).split("/")[0];
        return id && id.length >= 6 ? id : null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.slice("/shorts/".length).split("/")[0];
        return id && id.length >= 6 ? id : null;
      }
      if (parsed.pathname.startsWith("/v/")) {
        const id = parsed.pathname.slice("/v/".length).split("/")[0];
        return id && id.length >= 6 ? id : null;
      }
      const v = parsed.searchParams.get("v");
      return v && v.length >= 6 ? v : null;
    }
  } catch {
    /* fall through to regex */
  }

  const match = normalized.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|v\/)|[?&]v=)([\w-]{11})/,
  );
  return match?.[1] ?? null;
}

/** Parse YouTube URL → embed iframe src (phát trên trang, không mở tab YouTube). */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
