import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ADMIN_COOKIE_MAX_AGE_MS } from '../common/admin-session';
import { ADMIN_COOKIE_NAME, type AdminJwtPayload } from './admin-auth.guard';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Public } from './public.decorator';

function setAdminCookie(res: Response, token: string) {
  res.cookie(ADMIN_COOKIE_NAME, token, {
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
  constructor(private readonly authService: AuthService) {}

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
}
