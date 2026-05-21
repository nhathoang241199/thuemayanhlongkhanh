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

/** URL gốc công khai cho file upload (cùng domain với site khi API qua /api). */
export function getPublicApiUrl(): string {
  const explicit = process.env.PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production') {
    const site =
      process.env.FRONTEND_URL?.trim() ||
      process.env.FRONTEND_ORIGIN?.trim();
    if (site) return site.replace(/\/$/, '');
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
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

const VERIFICATION_UPLOAD_PATH =
  /^\/api\/uploads\/verification\/([^/]+)\/([^/]+)$/;

export function parseVerificationUploadPath(
  url: string,
): { customerId: string; filename: string } | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  let pathname: string;
  try {
    pathname = trimmed.includes('://')
      ? new URL(trimmed).pathname
      : trimmed.startsWith('/')
        ? trimmed
        : '';
  } catch {
    return null;
  }

  const match = VERIFICATION_UPLOAD_PATH.exec(pathname);
  if (!match) return null;

  const customerId = match[1];
  const filename = decodeURIComponent(match[2]);
  if (!customerId || !filename || filename.includes('..')) return null;
  return { customerId, filename };
}
