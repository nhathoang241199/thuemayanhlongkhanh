import { CameraBrand } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';

/** Lens còn hiển thị cho khách đặt thuê (quantity = 0 = hết hàng). */
export function publicListedLensWhere(
  brand?: CameraBrand,
): Prisma.LensWhereInput {
  return brand ? { brand, quantity: { gt: 0 } } : { quantity: { gt: 0 } };
}
