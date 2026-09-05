import { SetMetadata } from '@nestjs/common';

export const SHIPPER_ACCESS_KEY = 'shipperAccess';
export const ShipperAccess = () => SetMetadata(SHIPPER_ACCESS_KEY, true);

export const SHIPPER_COOKIE_NAME = 'shipper_token';

export type ShipperJwtPayload = {
  sub: string;
  role: 'shipper';
  shipperId: string;
  name: string;
};
