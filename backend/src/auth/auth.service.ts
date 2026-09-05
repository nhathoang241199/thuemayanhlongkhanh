import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'crypto';
import type { AdminJwtPayload } from './admin-auth.guard';
import type { ShipperJwtPayload } from './shipper-access.decorator';

function adminCredentials() {
  const username = process.env.ADMIN_USERNAME?.trim() || 'admin';
  const password = process.env.ADMIN_PASSWORD ?? '';
  const secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!password) {
    throw new Error('ADMIN_PASSWORD is required');
  }
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_JWT_SECRET must be at least 16 characters');
  }
  return { username, password, secret };
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  validateAdminLogin(username: string, password: string): AdminJwtPayload {
    const creds = adminCredentials();
    if (
      !safeEqual(username.trim(), creds.username) ||
      !safeEqual(password, creds.password)
    ) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
    }
    return { sub: creds.username, role: 'admin' };
  }

  signAdminToken(payload: AdminJwtPayload): string {
    return this.jwtService.sign(payload);
  }

  verifyAdminToken(token: string): AdminJwtPayload {
    return this.jwtService.verify<AdminJwtPayload>(token);
  }

  signShipperToken(payload: ShipperJwtPayload): string {
    return this.jwtService.sign(payload);
  }

  verifyShipperToken(token: string): ShipperJwtPayload {
    return this.jwtService.verify<ShipperJwtPayload>(token);
  }
}
