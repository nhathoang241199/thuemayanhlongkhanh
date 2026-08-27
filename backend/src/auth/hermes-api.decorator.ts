import { SetMetadata } from '@nestjs/common';

export const HERMES_API_ACCESS_KEY = 'hermesApiAccess';

/** Cho phép Hermes dùng X-Hermes-API-Key ngoài cookie admin. */
export const HermesApiAccess = () => SetMetadata(HERMES_API_ACCESS_KEY, true);