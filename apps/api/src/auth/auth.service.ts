import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private accessTtlSeconds() {
    return Number(this.config.get('JWT_ACCESS_TTL', 900));
  }

  private refreshTtlSeconds() {
    return Number(this.config.get('JWT_REFRESH_TTL', 60 * 60 * 24 * 7));
  }

  private async issueTokens(userId: string, tenantId: string, role: string) {
    const payload = { sub: userId, tenantId, role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.accessTtlSeconds(),
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshTtlSeconds(),
    });
    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { memberships: true },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = user.memberships;
    const membership =
      dto.tenantId != null
        ? memberships.find((m) => m.tenantId === dto.tenantId)
        : memberships.length === 1
          ? memberships[0]
          : undefined;

    if (!membership) {
      throw new UnauthorizedException('Tenant selection required');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, membership.tenantId, membership.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tenantId: membership.tenantId,
      role: membership.role,
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        tenantId: string;
        role: string;
      }>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const tokens = await this.issueTokens(payload.sub, payload.tenantId, payload.role);
      return { ...tokens };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
