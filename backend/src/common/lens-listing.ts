import { Prisma } from '../../generated/prisma/client';

/** Lens còn hiển thị cho khách (quantity > 0) và gắn được máy đã chọn. */
export function publicListedLensForCameraWhere(
  cameraId: string,
): Prisma.LensWhereInput {
  return {
    quantity: { gt: 0 },
    compatibleCameras: { some: { cameraId } },
  };
}
