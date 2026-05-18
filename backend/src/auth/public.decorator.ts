import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Bỏ qua AdminAuthGuard — route công khai (khách đặt lịch, webhook, …). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
