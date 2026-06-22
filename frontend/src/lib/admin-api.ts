import { toaster } from "@/lib/toaster";

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "AbortError"
  );
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Yêu cầu thất bại",
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return fallback;
}

/** Hiển thị lỗi API bằng toast; trả về message (null nếu request bị hủy). */
export function toastApiError(
  error: unknown,
  fallback = "Yêu cầu thất bại",
): string | null {
  if (isAbortError(error)) return null;
  const message = getApiErrorMessage(error, fallback);
  toaster.error({ title: message });
  return message;
}

export async function parseResponseError(
  res: Response,
  fallback = "Yêu cầu thất bại",
): Promise<string> {
  const text = await res.text().catch(() => "");
  const trimmed = text.trim();
  if (!trimmed) return res.statusText || fallback;
  try {
    const json = JSON.parse(trimmed) as { message?: string | string[] };
    if (typeof json.message === "string" && json.message.trim()) {
      return json.message.trim();
    }
    if (Array.isArray(json.message) && json.message.length > 0) {
      return json.message.map(String).join(", ");
    }
  } catch {
    // not JSON
  }
  return trimmed;
}

export async function throwIfNotOk(
  res: Response,
  fallback = "Yêu cầu thất bại",
): Promise<void> {
  if (res.ok) return;
  throw new Error(await parseResponseError(res, fallback));
}
