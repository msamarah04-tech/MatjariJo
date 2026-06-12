import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { env } from '../server/env.js';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(env.INITIAL_PLATFORM_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: env.INITIAL_PLATFORM_EMAIL },
    update: {
      name: env.INITIAL_PLATFORM_NAME,
      username: env.INITIAL_PLATFORM_USERNAME,
      role: 'PLATFORM_OWNER',
      ownerStatus: 'ACTIVE',
    },
    create: {
      email: env.INITIAL_PLATFORM_EMAIL,
      username: env.INITIAL_PLATFORM_USERNAME,
      name: env.INITIAL_PLATFORM_NAME,
      role: 'PLATFORM_OWNER',
      ownerStatus: 'ACTIVE',
      passwordHash,
    },
  });

  await prisma.platformSettings.upsert({
    where: { id: 'platform' },
    update: {},
    create: {
      id: 'platform',
      platformName: 'Matjari Jordan',
      defaultCurrency: 'USD',
      categories: JSON.stringify(['Apparel', 'Home', 'Beauty', 'Food', 'Electronics']),
      supportEmail: 'support@example.com',
      auditCap: 500,
      autoFlagThreshold: 3,
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
