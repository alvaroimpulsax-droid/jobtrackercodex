import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(
    tenantId: string,
    userId: string,
    events: Array<{
      startedAt: string;
      endedAt: string;
      appName: string;
      windowTitle?: string;
      url?: string;
      idle?: boolean;
      deviceId?: string;
    }>,
  ) {
    if (!events.length) {
      throw new BadRequestException('No events to ingest');
    }

    const data = events.map((event) => {
      const startedAt = new Date(event.startedAt);
      const endedAt = new Date(event.endedAt);
      if (endedAt < startedAt) {
        throw new BadRequestException('Invalid event time range');
      }
      return {
        tenantId,
        userId,
        deviceId: event.deviceId,
        startedAt,
        endedAt,
        appName: event.appName,
        windowTitle: event.windowTitle,
        url: event.url,
        idle: event.idle ?? false,
      };
    });

    await this.prisma.activityEvent.createMany({ data });
    return { inserted: data.length };
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

    return this.prisma.activityEvent.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 1000,
    });
  }
}
