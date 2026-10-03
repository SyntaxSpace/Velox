import 'dotenv/config';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const bootstrapEnv = z.object({
  BOOTSTRAP_PARTNER_NAME: z.string().trim().min(1),
  BOOTSTRAP_PARTNER_EMAIL: z
    .string()
    .trim()
    .email()
    .transform((email) => email.toLowerCase()),
  BOOTSTRAP_PARTNER_PASSWORD: z.string().min(16),
});

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Set NODE_ENV=production before creating the initial partner account.');
  }

  const configuration = bootstrapEnv.parse(process.env);
  const existingPartner = await prisma.user.findFirst({
    where: { role: { in: ['PARTNER', 'ADMIN'] } },
    select: { id: true },
  });

  if (existingPartner) {
    throw new Error('A partner or admin account already exists; bootstrap can only run once.');
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email: configuration.BOOTSTRAP_PARTNER_EMAIL },
    select: { id: true },
  });

  if (existingEmail) {
    throw new Error('The requested partner email is already in use.');
  }

  await prisma.user.create({
    data: {
      name: configuration.BOOTSTRAP_PARTNER_NAME,
      email: configuration.BOOTSTRAP_PARTNER_EMAIL,
      role: 'PARTNER',
      passwordHash: await argon2.hash(configuration.BOOTSTRAP_PARTNER_PASSWORD, {
        type: argon2.argon2id,
      }),
      firstLogin: false,
    },
  });

  console.info(`Initial Velox partner created for ${configuration.BOOTSTRAP_PARTNER_EMAIL}.`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown bootstrap error';
    console.error(`Unable to create the initial partner: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
