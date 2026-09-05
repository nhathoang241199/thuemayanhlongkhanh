import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ShipperModule } from '../shipper/shipper.module';
import { AdminAuthGuard } from './admin-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    ShipperModule,
    JwtModule.register({
      secret: process.env.ADMIN_JWT_SECRET ?? 'dev-only-change-me-32chars!!',
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AdminAuthGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
