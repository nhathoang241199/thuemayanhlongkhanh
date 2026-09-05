import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { HERMES_API_ACCESS_KEY } from './hermes-api.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import {
  SHIPPER_ACCESS_KEY,
  SHIPPER_COOKIE_NAME,
  type ShipperJwtPayload,
} from './shipper-access.decorator';

export const ADMIN_COOKIE_NAME = 'admin_token';

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export type AdminJwtPayload = {
  sub: string;
  role: 'admin';
};

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();

    const shipperAccess = this.reflector.getAllAndOverride<boolean>(
      SHIPPER_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (shipperAccess) {
      const token = req.cookies?.[SHIPPER_COOKIE_NAME] as string | undefined;
      if (!token) {
        throw new UnauthorizedException('Chưa đăng nhập shipper');
      }
      try {
        const payload = this.jwtService.verify<ShipperJwtPayload>(token);
        if (payload.role !== 'shipper' || !payload.shipperId) {
          throw new UnauthorizedException('Phiên shipper không hợp lệ');
        }
        (req as Request & { shipper?: ShipperJwtPayload }).shipper = payload;
        return true;
      } catch {
        throw new UnauthorizedException('Phiên shipper hết hạn hoặc không hợp lệ');
      }
    }

    const hermesApiAccess = this.reflector.getAllAndOverride<boolean>(
      HERMES_API_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const hermesApiKey = req.header('x-hermes-api-key');
    const configuredHermesApiKey = process.env.HERMES_API_KEY;
    if (
      hermesApiAccess &&
      hermesApiKey &&
      configuredHermesApiKey &&
      safeEqual(hermesApiKey, configuredHermesApiKey)
    ) {
      (req as Request & { admin?: AdminJwtPayload }).admin = {
        sub: 'hermes-agent',
        role: 'admin',
      };
      return true;
    }

    const token = req.cookies?.[ADMIN_COOKIE_NAME] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Chưa đăng nhập admin');
    }

    try {
      const payload = this.jwtService.verify<AdminJwtPayload>(token);
      if (payload.role !== 'admin') {
        throw new UnauthorizedException('Phiên admin không hợp lệ');
      }
      (req as Request & { admin?: AdminJwtPayload }).admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Phiên admin hết hạn hoặc không hợp lệ');
    }
  }
}
