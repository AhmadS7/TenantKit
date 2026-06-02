import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, seconds } from '@nestjs/throttler';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from '../common/public.decorator';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: ExpressRequest, @Body() _loginDto: LoginDto) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.authService.login(req.user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refreshToken') refreshToken: string) {
    await this.authService.logout(refreshToken);
    return { success: true };
  }

  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    const token = await this.authService.requestPasswordReset(dto.email);

    // Always respond identically regardless of whether the email exists, so the
    // endpoint cannot be used to enumerate registered accounts. The token is
    // only echoed back outside production to support local/e2e testing — in
    // production it is delivered exclusively via email.
    const response: { success: true; resetToken?: string } = { success: true };
    if (process.env.NODE_ENV !== 'production' && token) {
      response.resetToken = token;
    }
    return response;
  }

  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { success: true };
  }

  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: ExpressRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    await this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true };
  }
}
