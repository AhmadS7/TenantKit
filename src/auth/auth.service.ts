import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';
import { Tenant } from '../tenancy/tenant.entity';
import {
  Membership,
  MembershipRole,
  MembershipStatus,
} from '../memberships/membership.entity';
import { RefreshToken } from './refresh-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { RegisterDto } from './dto/register.dto';
import { EmailQueueService } from '../queue/email-queue.service';
import type { AuthUser } from '../types/express';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(Membership)
    private membershipRepo: Repository<Membership>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepo: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private dataSource: DataSource,
    private config: ConfigService,
    private emailQueue: EmailQueueService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async validateUser(email: string, pass: string): Promise<AuthUser | null> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, refreshTokenHash, ...result } = user;
      return result;
    }
    return null;
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    // Check if user or tenant slug already exists
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const existingTenant = await this.tenantRepo.findOne({
      where: { slug: dto.tenantSlug.toLowerCase() },
    });
    if (existingTenant) {
      throw new ConflictException('Tenant subdomain/slug already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Atomically create User, Tenant, and Owner Membership
    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email,
        passwordHash,
        emailVerified: false,
      });
      const savedUser = await manager.save(User, user);

      const tenant = manager.create(Tenant, {
        name: dto.tenantName,
        slug: dto.tenantSlug.toLowerCase(),
        planTier: 'free',
        subscriptionStatus: 'active',
      });
      const savedTenant = await manager.save(Tenant, tenant);

      const membership = manager.create(Membership, {
        userId: savedUser.id,
        tenantId: savedTenant.id,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });
      await manager.save(Membership, membership);

      return {
        user: { id: savedUser.id, email: savedUser.email },
        tenant: {
          id: savedTenant.id,
          slug: savedTenant.slug,
          name: savedTenant.name,
        },
      };
    });
  }

  async login(user: AuthUser) {
    const payload = { email: user.email, sub: user.id };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    // Generate a secure high-entropy refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshHash = this.hashToken(rawRefreshToken);

    // Store in DB with 7-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenEntity = this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt,
    });
    await this.refreshTokenRepo.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user,
    };
  }

  async refresh(token: string) {
    const hash = this.hashToken(token);
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { tokenHash: hash },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid session');
    }

    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Session has been revoked');
    }

    // Reuse detection
    if (storedToken.isUsed) {
      // Revoke all tokens for this user instantly
      await this.refreshTokenRepo.update(
        { userId: storedToken.userId },
        { isRevoked: true },
      );
      throw new UnauthorizedException(
        'Session reuse detected. Access revoked.',
      );
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Session has expired');
    }

    // Mark current token as used
    storedToken.isUsed = true;
    await this.refreshTokenRepo.save(storedToken);

    // Fetch user details
    const user = await this.userRepo.findOne({
      where: { id: storedToken.userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Issue rotated tokens
    const { passwordHash, refreshTokenHash, ...userResult } = user;
    return this.login(userResult);
  }

  async logout(token: string) {
    const hash = this.hashToken(token);
    await this.refreshTokenRepo.update(
      { tokenHash: hash },
      { isRevoked: true },
    );
  }

  /**
   * Issues a single-use, hashed password-reset token, persists it, and queues a
   * delivery email. Returns the raw token so callers can expose it in
   * non-production environments; the response itself never reveals whether the
   * email is registered (enumeration protection).
   */
  async requestPasswordReset(email: string): Promise<string | null> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepo.findOne({
      where: { email: normalizedEmail },
    });
    if (!user) {
      return null;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any outstanding tokens for this user before issuing a new one.
    await this.passwordResetTokenRepo.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    await this.passwordResetTokenRepo.save(
      this.passwordResetTokenRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      }),
    );

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    await this.emailQueue.enqueuePasswordReset({
      to: normalizedEmail,
      resetUrl,
    });

    return rawToken;
  }

  async resetPassword(token: string, newPass: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const record = await this.passwordResetTokenRepo.findOne({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.userRepo.findOne({ where: { id: record.userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.dataSource.transaction(async (manager) => {
      user.passwordHash = await bcrypt.hash(newPass, 12);
      await manager.save(User, user);

      // Spend the token (single use).
      record.usedAt = new Date();
      await manager.save(PasswordResetToken, record);

      // A password reset invalidates every existing session.
      await manager.update(
        RefreshToken,
        { userId: user.id },
        { isRevoked: true },
      );
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.dataSource.transaction(async (manager) => {
      user.passwordHash = await bcrypt.hash(newPassword, 12);
      await manager.save(User, user);

      // Changing the password logs out all other sessions.
      await manager.update(
        RefreshToken,
        { userId: user.id },
        { isRevoked: true },
      );
    });
  }
}
