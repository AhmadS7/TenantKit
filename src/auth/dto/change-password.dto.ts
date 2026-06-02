import { IsString, IsNotEmpty } from 'class-validator';
import { IsStrongPassword } from './password.validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsStrongPassword()
  newPassword: string;
}
