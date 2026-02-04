import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(tenantId: string, userId: string, dto: { deviceName: string; platform: string }) {
    const existing = await this.prisma.device.findFirst({
      where: { tenantId, userId, deviceName: dto.deviceName },
    });

    if (existing) {
      return this.prisma.device.update({
        where: { id: existing.id },
        data: { platform: dto.platform, lastSeenAt: new Date() },
      });
    }

    return this.prisma.device.create({
      data: {
        tenantId,
        userId,
        deviceName: dto.deviceName,
        platform: dto.platform,
        lastSeenAt: new Date(),
      },
    });
  }
}
