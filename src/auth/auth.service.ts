import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
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
import { RegisterDto } from './dto/register.dto';
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
    private jwtService: JwtService,
    private dataSource: DataSource,
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

  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create a temporary single-use token containing user ID
    const resetPayload = { sub: user.id, purpose: 'password_reset' };
    return this.jwtService.sign(resetPayload, { expiresIn: '1h' });
  }

  async resetPassword(token: string, newPass: string) {
    try {
      const payload = this.jwtService.verify<{ purpose?: string; sub: string }>(
        token,
      );
      if (payload.purpose !== 'password_reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.passwordHash = await bcrypt.hash(newPass, 12);
      await this.userRepo.save(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}
