import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Body for the refresh/logout endpoints. Previously these read a raw
 * `@Body('refreshToken')` primitive, which bypassed the global ValidationPipe
 * (whitelist/forbidNonWhitelisted only shape full DTO bodies). Routing through a
 * DTO enforces type validation and strips unexpected fields.
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
