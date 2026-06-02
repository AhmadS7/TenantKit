import { applyDecorators } from '@nestjs/common';
import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * Shared password policy applied to every field that *sets* a password
 * (registration, reset, change). Length is bounded at 72 because bcrypt
 * silently truncates input beyond 72 bytes — rejecting longer input avoids a
 * surprising "only the first 72 chars matter" foot-gun.
 */
export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(8, { message: 'Password must be at least 8 characters long.' }),
    MaxLength(72, { message: 'Password must be at most 72 characters long.' }),
  );
}
