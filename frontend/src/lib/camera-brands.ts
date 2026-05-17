import type { CameraBrand } from "@/lib/booking-api";

export type BrandOption = {
  id: CameraBrand;
  label: string;
  logoSrc: string;
  /** Chiều cao logo trên nút — chỉnh theo padding trong file ảnh */
  logoHeight: string;
};

export const CAMERA_BRAND_OPTIONS: BrandOption[] = [
  {
    id: "CANON",
    label: "Canon",
    logoSrc: "/brands/canon.png",
    logoHeight: "4.25rem",
  },
  {
    id: "FUJIFILM",
    label: "Fujifilm",
    logoSrc: "/brands/fujifilm.png",
    logoHeight: "3.25rem",
  },
  {
    id: "DJI",
    label: "DJI",
    logoSrc: "/brands/dji.png",
    logoHeight: "3.5rem",
  },
];

export const BRAND_LABEL: Record<CameraBrand, string> = {
  CANON: "Canon",
  FUJIFILM: "Fujifilm",
  DJI: "DJI",
};

export function brandOption(id: CameraBrand): BrandOption {
  const found = CAMERA_BRAND_OPTIONS.find((b) => b.id === id);
  if (!found) throw new Error(`Unknown brand: ${id}`);
  return found;
}
