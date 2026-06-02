import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { IsStrongPassword } from './password.validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsString()
  @IsNotEmpty()
  tenantName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Tenant slug can only contain lowercase letters, numbers, and hyphens.',
  })
  tenantSlug: string;
}
