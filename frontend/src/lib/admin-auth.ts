import { apiBase } from "@/lib/api-base";

export const ADMIN_COOKIE_NAME = "admin_token";

export async function adminLogin(
  username: string,
  password: string,
): Promise<void> {
  const res = await fetch(`${apiBase()}/api/auth/admin/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Đăng nhập thất bại");
  }
}

export async function adminLogout(): Promise<void> {
  await fetch(`${apiBase()}/api/auth/admin/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function fetchAdminSession(): Promise<{
  username: string;
  role: string;
} | null> {
  const res = await fetch(`${apiBase()}/api/auth/admin/me`, {
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  return (await res.json()) as { username: string; role: string };
}
