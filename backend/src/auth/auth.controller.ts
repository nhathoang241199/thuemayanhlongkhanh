import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ADMIN_COOKIE_MAX_AGE_MS } from '../common/admin-session';
import { ADMIN_COOKIE_NAME, type AdminJwtPayload } from './admin-auth.guard';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Public } from './public.decorator';
import { ShipperService } from '../shipper/shipper.service';
import { ShipperPushService } from '../shipper/shipper-push.service';
import { ShipperLoginDto } from '../shipper/dto/shipper.dto';
import {
  DeleteShipperPushSubscriptionDto,
  UpsertShipperPushSubscriptionDto,
} from '../shipper/dto/shipper-push.dto';
import {
  SHIPPER_COOKIE_NAME,
  ShipperAccess,
  type ShipperJwtPayload,
} from './shipper-access.decorator';

function setAdminCookie(res: Response, token: string) {
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE_MS,
  });
}

function setShipperCookie(res: Response, token: string) {
  res.cookie(SHIPPER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE_MS,
  });
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly shipperService: ShipperService,
    private readonly shipperPush: ShipperPushService,
  ) {}

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập admin' })
  @ApiOkResponse({ description: '{ ok: true, username }' })
  login(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const payload = this.authService.validateAdminLogin(
      dto.username,
      dto.password,
    );
    const token = this.authService.signAdminToken(payload);
    setAdminCookie(res, token);
    return { ok: true, username: payload.sub };
  }

  @Public()
  @Post('admin/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất admin' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ADMIN_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { ok: true };
  }

  @Get('admin/me')
  @ApiOperation({ summary: 'Phiên admin hiện tại' })
  @ApiOkResponse({ description: '{ username, role }' })
  me(@Req() req: Request & { admin?: AdminJwtPayload }) {
    const admin = req.admin;
    return {
      username: admin?.sub ?? 'admin',
      role: admin?.role ?? 'admin',
    };
  }

  @Public()
  @Post('shipper/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập shipper (SĐT + mật khẩu)' })
  async shipperLogin(
    @Body() dto: ShipperLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const shipper = await this.shipperService.validateLogin(
      dto.phone,
      dto.password,
    );
    const payload: ShipperJwtPayload = {
      sub: shipper.phone,
      role: 'shipper',
      shipperId: shipper.id,
      name: shipper.name,
    };
    const token = this.authService.signShipperToken(payload);
    setShipperCookie(res, token);
    return { ok: true, phone: shipper.phone, name: shipper.name };
  }

  @Public()
  @Post('shipper/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất shipper' })
  shipperLogout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SHIPPER_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { ok: true };
  }

  @ShipperAccess()
  @Get('shipper/me')
  @ApiOperation({ summary: 'Phiên shipper hiện tại' })
  async shipperMe(@Req() req: Request & { shipper?: ShipperJwtPayload }) {
    const shipper = req.shipper;
    let name = shipper?.name?.trim() ?? '';
    let balanceVnd = 0;
    let payoutQrUrl = '';
    let payoutRequestedAt: string | null = null;
    if (shipper?.shipperId) {
      const profile = await this.shipperService.findSessionById(shipper.shipperId);
      if (profile) {
        if (!name) name = profile.name;
        balanceVnd = profile.balanceVnd;
        payoutQrUrl = profile.payoutQrUrl;
        payoutRequestedAt = profile.payoutRequestedAt;
      }
    }
    return {
      phone: shipper?.sub ?? '',
      name,
      balanceVnd,
      payoutQrUrl,
      payoutRequestedAt,
      role: shipper?.role ?? 'shipper',
      shipperId: shipper?.shipperId ?? '',
    };
  }

  @ShipperAccess()
  @Post('shipper/request-payout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Shipper yêu cầu rút tiền (chờ shop chuyển khoản)' })
  async shipperRequestPayout(
    @Req() req: Request & { shipper?: ShipperJwtPayload },
  ) {
    const shipperId = req.shipper?.shipperId;
    if (!shipperId) {
      throw new UnauthorizedException('Phiên shipper không hợp lệ');
    }
    return this.shipperService.requestPayout(shipperId);
  }

  @ShipperAccess()
  @Get('shipper/push/vapid-public-key')
  @ApiOperation({ summary: 'VAPID public key cho Web Push' })
  shipperPushVapidKey() {
    return this.shipperPush.getPublicKey();
  }

  @ShipperAccess()
  @Post('shipper/push/subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng ký Web Push cho shipper' })
  async shipperPushSubscribe(
    @Req() req: Request & { shipper?: ShipperJwtPayload },
    @Body() dto: UpsertShipperPushSubscriptionDto,
  ) {
    const shipperId = req.shipper?.shipperId;
    if (!shipperId) {
      throw new UnauthorizedException('Phiên shipper không hợp lệ');
    }
    const row = await this.shipperPush.upsertSubscription(shipperId, dto);
    return { ok: true, id: row.id };
  }

  @ShipperAccess()
  @Post('shipper/push/unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Huỷ Web Push subscription' })
  async shipperPushUnsubscribe(
    @Req() req: Request & { shipper?: ShipperJwtPayload },
    @Body() dto: DeleteShipperPushSubscriptionDto,
  ) {
    const shipperId = req.shipper?.shipperId;
    if (!shipperId) {
      throw new UnauthorizedException('Phiên shipper không hợp lệ');
    }
    return this.shipperPush.deleteSubscription(shipperId, dto);
  }
}
