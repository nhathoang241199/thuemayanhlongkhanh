import { apiBase } from "@/lib/api-base";
import { throwIfNotOk } from "@/lib/admin-api";

export async function uploadBookingCollateralImage(
  bookingId: string,
  file: File,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${apiBase()}/api/bookings/${encodeURIComponent(bookingId)}/collateral-image`,
    { method: "POST", credentials: "include", body: form },
  );
  await throwIfNotOk(res, "Lỗi upload ảnh thế chân");
  const json = (await res.json()) as { collateralImageUrl?: unknown };
  if (typeof json.collateralImageUrl !== "string" || !json.collateralImageUrl) {
    throw new Error("Phản hồi upload không hợp lệ");
  }
  return json.collateralImageUrl;
}

export async function saveBookingContract(
  bookingId: string,
  body: { contractCccd: string; collateralMethod?: string },
): Promise<void> {
  const res = await fetch(
    `${apiBase()}/api/bookings/${encodeURIComponent(bookingId)}/contract`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  await throwIfNotOk(res, "Lỗi lưu thông tin hợp đồng");
}
