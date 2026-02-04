import { ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrapTenant(secret: string | undefined, dto: { tenantName: string; ownerEmail: string; ownerName: string; ownerPassword: string }) {
    if (!secret) {
      throw new ForbiddenException('Bootstrap secret required');
    }

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);
    const email = dto.ownerEmail.toLowerCase();

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.tenantName,
        retentionPolicy: {
          create: {
            screenshotRetentionDays: 15,
          },
        },
        memberships: {
          create: {
            user: {
              create: {
                email,
                name: dto.ownerName,
                passwordHash,
              },
            },
            role: 'owner',
            canViewOwnHistory: true,
          },
        },
      },
      include: {
        memberships: { include: { user: true } },
      },
    });

    const owner = tenant.memberships[0]?.user;
    return {
      tenantId: tenant.id,
      owner: owner ? { id: owner.id, email: owner.email, name: owner.name } : null,
    };
  }
}
