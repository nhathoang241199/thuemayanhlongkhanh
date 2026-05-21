import { apiBase } from "@/lib/api-base";

export const VERIFICATION_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_VERIFICATION_IMAGES = 10;

export function parseVerificationUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0,
  );
}

/** Hiển thị ảnh — sửa URL lưu nhầm http://localhost:3000 trên production. */
export function resolveVerificationImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const rewritePath = (pathname: string, search: string) => {
    const siteBase =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_API_URL ?? apiBase()).replace(/\/$/, "");
    if (!siteBase) return trimmed;
    return `${siteBase}${pathname}${search}`;
  };

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.hostname === "localhost" &&
      parsed.pathname.startsWith("/api/uploads/verification/")
    ) {
      return rewritePath(parsed.pathname, parsed.search);
    }
  } catch {
    if (trimmed.startsWith("/api/uploads/verification/")) {
      return rewritePath(trimmed, "");
    }
  }
  return trimmed;
}

export function isVerificationImageFile(file: File): boolean {
  return (
    VERIFICATION_IMAGE_ACCEPT.split(",").includes(file.type) ||
    file.type.startsWith("image/")
  );
}

export async function uploadCustomerVerificationImage(
  customerId: string,
  file: File,
): Promise<string[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${apiBase()}/api/customers/${encodeURIComponent(customerId)}/verification-images`,
    {
      method: "POST",
      credentials: "include",
      body: form,
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }
  const json = (await res.json()) as { verificationImageUrls?: unknown };
  return parseVerificationUrls(json.verificationImageUrls);
}
