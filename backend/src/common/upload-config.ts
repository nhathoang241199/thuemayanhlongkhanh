import { join } from 'path';

export const MAX_VERIFICATION_IMAGES = 10;
export const MAX_VERIFICATION_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_VERIFICATION_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR?.trim() || join(process.cwd(), 'uploads');
}

export function getPublicApiUrl(): string {
  const raw =
    process.env.PUBLIC_API_URL?.trim() ||
    `http://localhost:${process.env.PORT ?? 3000}`;
  return raw.replace(/\/$/, '');
}

export function verificationImageExtension(mime: string): string {
  return MIME_EXT[mime] ?? '';
}

export function verificationUploadPublicUrl(
  customerId: string,
  filename: string,
): string {
  return `${getPublicApiUrl()}/api/uploads/verification/${customerId}/${encodeURIComponent(filename)}`;
}

export function verificationUploadDiskPath(
  customerId: string,
  filename: string,
): string {
  return join(getUploadDir(), 'verification', customerId, filename);
}

/** Path prefix for URLs we own (local uploads). */
export function verificationUploadUrlPrefix(): string {
  return `${getPublicApiUrl()}/api/uploads/verification/`;
}

export function parseVerificationUploadPath(
  url: string,
): { customerId: string; filename: string } | null {
  const prefix = verificationUploadUrlPrefix();
  if (!url.startsWith(prefix)) return null;
  const rest = url.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const customerId = rest.slice(0, slash);
  const filename = decodeURIComponent(rest.slice(slash + 1));
  if (!customerId || !filename || filename.includes('..')) return null;
  return { customerId, filename };
}
