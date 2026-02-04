import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getRetention(tenantId: string) {
    const policy = await this.prisma.retentionPolicy.findUnique({
      where: { tenantId },
    });
    return (
      policy ?? {
        tenantId,
        timeRetentionDays: null,
        activityRetentionDays: null,
        screenshotRetentionDays: 15,
      }
    );
  }

  async updateRetention(
    tenantId: string,
    actorUserId: string,
    dto: { timeRetentionDays?: number | null; activityRetentionDays?: number | null; screenshotRetentionDays?: number | null },
  ) {
    const update: {
      timeRetentionDays?: number | null;
      activityRetentionDays?: number | null;
      screenshotRetentionDays?: number | null;
    } = {};

    if ('timeRetentionDays' in dto) {
      update.timeRetentionDays = dto.timeRetentionDays ?? null;
    }
    if ('activityRetentionDays' in dto) {
      update.activityRetentionDays = dto.activityRetentionDays ?? null;
    }
    if ('screenshotRetentionDays' in dto) {
      update.screenshotRetentionDays = dto.screenshotRetentionDays ?? null;
    }

    const policy = await this.prisma.retentionPolicy.upsert({
      where: { tenantId },
      update,
      create: {
        tenantId,
        timeRetentionDays: dto.timeRetentionDays ?? null,
        activityRetentionDays: dto.activityRetentionDays ?? null,
        screenshotRetentionDays: dto.screenshotRetentionDays ?? 15,
      },
    });

    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'policy.retention.update',
      entity: 'retentionPolicy',
      entityId: policy.id,
      metadata: dto,
    });

    return policy;
  }

  async getCapturePolicy(tenantId: string, userId: string) {
    const policy = await this.prisma.capturePolicy.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!policy) {
      throw new NotFoundException('Capture policy not found');
    }
    return policy;
  }

  async setCapturePolicy(tenantId: string, actorUserId: string, userId: string, intervalSeconds: number) {
    const policy = await this.prisma.capturePolicy.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      update: { intervalSeconds },
      create: { tenantId, userId, intervalSeconds },
    });

    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'policy.capture.update',
      entity: 'capturePolicy',
      entityId: policy.id,
      metadata: { userId, intervalSeconds },
    });

    return policy;
  }
}
