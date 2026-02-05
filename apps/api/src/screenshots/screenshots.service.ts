import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class ScreenshotsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl?: string;
  private readonly signedUrls: boolean;
  private readonly signedTtlSeconds: number;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    this.bucket = this.config.get<string>('S3_BUCKET') ?? '';
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL');
    this.signedUrls = (this.config.get<string>('S3_SIGNED_URLS') ?? '').toLowerCase() === 'true';
    this.signedTtlSeconds = Number(this.config.get<string>('S3_SIGNED_TTL_SECONDS') ?? 300);

    this.s3 = new S3Client({
      region: this.config.get<string>('S3_REGION') ?? 'auto',
      endpoint: endpoint || undefined,
      forcePathStyle: !!endpoint,
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY') ?? '',
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY') ?? '',
      },
    });
  }

  private computeStorageKey(tenantId: string, userId: string, takenAt: Date) {
    const yyyy = takenAt.getUTCFullYear();
    const mm = String(takenAt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(takenAt.getUTCDate()).padStart(2, '0');
    return `${tenantId}/${userId}/${yyyy}/${mm}/${dd}/${randomUUID()}.jpg`;
  }

  private async getExpiresAt(tenantId: string, takenAt: Date) {
    const policy = await this.prisma.retentionPolicy.findUnique({ where: { tenantId } });
    const days = policy?.screenshotRetentionDays ?? 15;
    if (days === null) return null;
    const expires = new Date(takenAt);
    expires.setDate(expires.getDate() + days);
    return expires;
  }

  async presign(tenantId: string, userId: string, dto: { deviceId?: string; takenAt?: string }) {
    if (!this.bucket) {
      throw new ForbiddenException('S3 bucket not configured');
    }
    const takenAt = dto.takenAt ? new Date(dto.takenAt) : new Date();
    const storageKey = this.computeStorageKey(tenantId, userId, takenAt);
    const expiresAt = await this.getExpiresAt(tenantId, takenAt);

    const record = await this.prisma.screenshot.create({
      data: {
        tenantId,
        userId,
        deviceId: dto.deviceId,
        takenAt,
        storageKey,
        expiresAt,
      },
    });

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: 'image/jpeg',
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });

    return {
      screenshotId: record.id,
      uploadUrl,
      storageKey,
      expiresAt,
    };
  }

  async complete(tenantId: string, userId: string, screenshotId: string, sizeBytes?: number) {
    const record = await this.prisma.screenshot.findFirst({
      where: { id: screenshotId, tenantId, userId },
    });
    if (!record) {
      throw new ForbiddenException('Screenshot not found');
    }
    return this.prisma.screenshot.update({
      where: { id: screenshotId },
      data: { sizeBytes: sizeBytes ?? record.sizeBytes },
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
      where.takenAt = {};
      if (query.from) where.takenAt.gte = new Date(query.from);
      if (query.to) where.takenAt.lte = new Date(query.to);
    }

    const records = await this.prisma.screenshot.findMany({
      where,
      orderBy: { takenAt: 'desc' },
      take: 200,
    });

    const publicBase = this.publicUrl ? this.publicUrl.replace(/\/$/, '') : null;

    return Promise.all(
      records.map(async (rec) => {
        let url: string | null = null;
        if (publicBase && !this.signedUrls) {
          url = `${publicBase}/${rec.storageKey}`;
        } else if (this.bucket) {
          const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: rec.storageKey,
          });
          url = await getSignedUrl(this.s3, command, { expiresIn: this.signedTtlSeconds });
        }

        return {
          id: rec.id,
          takenAt: rec.takenAt,
          storageKey: rec.storageKey,
          url,
          sizeBytes: rec.sizeBytes,
          expiresAt: rec.expiresAt,
        };
      }),
    );
  }
}
