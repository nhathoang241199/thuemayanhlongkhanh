import { apiBase } from "@/lib/api-base";

export const VERIFICATION_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_VERIFICATION_IMAGES = 10;

export function parseVerificationUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0,
  );
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
