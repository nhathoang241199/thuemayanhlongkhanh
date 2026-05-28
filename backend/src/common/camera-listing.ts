import { CameraBrand } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';

/** Máy còn hiển thị cho khách đặt thuê (quantity = 0 = đã bán / ngừng cho thuê). */
export function publicListedCameraWhere(
  brand?: CameraBrand,
): Prisma.CameraWhereInput {
  return brand ? { brand, quantity: { gt: 0 } } : { quantity: { gt: 0 } };
}
