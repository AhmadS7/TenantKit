import { IsString, IsNotEmpty } from 'class-validator';
import { IsStrongPassword } from './password.validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsStrongPassword()
  password: string;
}
