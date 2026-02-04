import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimeService {
  constructor(private readonly prisma: PrismaService) {}

  async start(tenantId: string, userId: string, dto: { deviceId?: string; startedAt?: string }) {
    const open = await this.prisma.timeEntry.findFirst({
      where: { tenantId, userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (open) {
      throw new BadRequestException('There is already an open time entry');
    }

    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    const entry = await this.prisma.timeEntry.create({
      data: {
        tenantId,
        userId,
        deviceId: dto.deviceId,
        startedAt,
        source: 'manual',
      },
    });
    return entry;
  }

  async stop(tenantId: string, userId: string, dto: { endedAt?: string }) {
    const open = await this.prisma.timeEntry.findFirst({
      where: { tenantId, userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!open) {
      throw new BadRequestException('No open time entry');
    }

    const endedAt = dto.endedAt ? new Date(dto.endedAt) : new Date();
    if (endedAt < open.startedAt) {
      throw new BadRequestException('End time is before start time');
    }

    return this.prisma.timeEntry.update({
      where: { id: open.id },
      data: { endedAt },
    });
  }

  async list(
    tenantId: string,
    requesterId: string,
    requesterRole: string,
    query: { userId?: string; from?: string; to?: string },
  ) {
    const isPrivileged = ['owner', 'admin', 'manager'].includes(requesterRole);
    const targetUserId = query.userId ?? requesterId;

    if (!isPrivileged && targetUserId !== requesterId) {
      throw new ForbiddenException('Not allowed to view other users');
    }

    if (!isPrivileged) {
      const membership = await this.prisma.membership.findUnique({
        where: { tenantId_userId: { tenantId, userId: requesterId } },
      });
      if (!membership?.canViewOwnHistory) {
        throw new ForbiddenException('History access disabled');
      }
    }

    const where: any = { tenantId, userId: targetUserId };
    if (query.from || query.to) {
      where.startedAt = {};
      if (query.from) {
        where.startedAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.startedAt.lte = new Date(query.to);
      }
    }

    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 500,
    });
  }

  async active(tenantId: string, requesterRole: string) {
    const isPrivileged = ['owner', 'admin', 'manager', 'auditor'].includes(requesterRole);
    if (!isPrivileged) {
      throw new ForbiddenException('Not allowed to view active sessions');
    }

    const entries = await this.prisma.timeEntry.findMany({
      where: { tenantId, endedAt: null },
      include: { user: true, device: true },
      orderBy: { startedAt: 'desc' },
    });

    if (!entries.length) {
      return [];
    }

    const userIds = [...new Set(entries.map((entry) => entry.userId))];
    const memberships = await this.prisma.membership.findMany({
      where: { tenantId, userId: { in: userIds } },
    });
    const roleByUser = new Map(memberships.map((m) => [m.userId, m.role]));

    const results: Array<{
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      role: string;
      deviceId: string | null;
      deviceName: string | null;
      platform: string | null;
      startedAt: Date;
      lastActivityAt: Date | null;
      lastApp: string | null;
      lastWindowTitle: string | null;
      lastUrl: string | null;
      idle: boolean | null;
    }> = [];
    for (const entry of entries) {
      const lastEvent = await this.prisma.activityEvent.findFirst({
        where: { tenantId, userId: entry.userId },
        orderBy: { endedAt: 'desc' },
      });

      results.push({
        id: entry.id,
        userId: entry.userId,
        userName: entry.user.name,
        userEmail: entry.user.email,
        role: roleByUser.get(entry.userId) ?? 'employee',
        deviceId: entry.deviceId,
        deviceName: entry.device?.deviceName ?? null,
        platform: entry.device?.platform ?? null,
        startedAt: entry.startedAt,
        lastActivityAt: lastEvent?.endedAt ?? null,
        lastApp: lastEvent?.appName ?? null,
        lastWindowTitle: lastEvent?.windowTitle ?? null,
        lastUrl: lastEvent?.url ?? null,
        idle: lastEvent?.idle ?? null,
      });
    }

    return results;
  }
}
