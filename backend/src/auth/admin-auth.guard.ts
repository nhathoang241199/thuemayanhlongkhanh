import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

export const ADMIN_COOKIE_NAME = 'admin_token';

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
