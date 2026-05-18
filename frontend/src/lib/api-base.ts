/** Base URL API — để trống NEXT_PUBLIC_API_URL để dùng proxy /api cùng origin (cookie admin). */
export function apiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured !== undefined && configured !== "") {
    return configured.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return "";
  }
  return (process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
}
