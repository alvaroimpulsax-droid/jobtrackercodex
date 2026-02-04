import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createUser(
    tenantId: string,
    actorUserId: string,
    dto: { email: string; name: string; password: string; role: Role; canViewOwnHistory?: boolean },
  ) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        passwordHash,
        memberships: {
          create: {
            tenantId,
            role: dto.role,
            canViewOwnHistory: dto.canViewOwnHistory ?? false,
          },
        },
      },
    });

    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'user.create',
      entity: 'user',
      entityId: user.id,
      metadata: { role: dto.role },
    });

    return { id: user.id, email: user.email, name: user.name };
  }

  async listUsers(tenantId: string, search?: string) {
    const where: any = {
      memberships: { some: { tenantId } },
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        memberships: {
          where: { tenantId },
          select: { role: true, canViewOwnHistory: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      role: user.memberships[0]?.role ?? 'employee',
      canViewOwnHistory: user.memberships[0]?.canViewOwnHistory ?? false,
    }));
  }

  async updateUser(
    tenantId: string,
    actorUserId: string,
    userId: string,
    dto: { name?: string; status?: 'active' | 'disabled'; role?: Role; canViewOwnHistory?: boolean },
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('User not found for tenant');
    }

    const updates: any = {};
    if (dto.name) updates.name = dto.name;
    if (dto.status) updates.status = dto.status;

    if (Object.keys(updates).length) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updates,
      });
    }

    if (dto.role || dto.canViewOwnHistory !== undefined) {
      await this.prisma.membership.update({
        where: { tenantId_userId: { tenantId, userId } },
        data: {
          role: dto.role ?? membership.role,
          canViewOwnHistory: dto.canViewOwnHistory ?? membership.canViewOwnHistory,
        },
      });
    }

    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'user.update',
      entity: 'user',
      entityId: userId,
      metadata: dto,
    });

    return { ok: true };
  }
}
