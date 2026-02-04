/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();

async function main() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET not configured');
  }

  const endpoint = process.env.S3_ENDPOINT;
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: endpoint || undefined,
    forcePathStyle: !!endpoint,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
  });

  const now = new Date();
  const expired = await prisma.screenshot.findMany({
    where: { expiresAt: { lte: now } },
    select: { id: true, storageKey: true },
    take: 1000,
  });

  if (!expired.length) {
    console.log('No expired screenshots');
    return;
  }

  for (const shot of expired) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: shot.storageKey }));
    } catch (err) {
      console.warn('Failed to delete object', shot.storageKey, err?.message || err);
    }
  }

  const ids = expired.map((shot) => shot.id);
  await prisma.screenshot.deleteMany({ where: { id: { in: ids } } });
  console.log(`Purged ${ids.length} screenshots`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
