import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    tenantId: string;
    actorUserId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        metadata: params.metadata ?? undefined,
      },
    });
  }

  async list(tenantId: string, query: { from?: string; to?: string; limit?: number }) {
    const where: any = { tenantId };
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.createdAt.lte = new Date(query.to);
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 200,
    });
  }
}
