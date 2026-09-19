import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const shop = await prisma.shop.upsert({
    where: { qrCode: 'shop_quickprint_hub' },
    update: {},
    create: {
      name: 'QuickPrint Hub',
      qrCode: 'shop_quickprint_hub',
      status: 'ACTIVE',
      address: 'Near Engineering College, Pune',
      phone: '9876543210',
      email: 'shop@quickprint.com',
    },
  });

  const ownerPassword = await argon2.hash('VeloxDev123!');
  const operatorPassword = await argon2.hash('VeloxDev123!');
  const customerPassword = await argon2.hash('VeloxDev123!');

  const owner = await prisma.user.upsert({
    where: { email: 'owner@velox.dev' },
    update: {},
    create: {
      name: 'Raj Kumar',
      email: 'owner@velox.dev',
      role: 'OWNER',
      shopId: shop.id,
      passwordHash: ownerPassword,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@velox.dev' },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: 'operator@velox.dev',
      role: 'OPERATOR',
      shopId: shop.id,
      passwordHash: operatorPassword,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@velox.dev' },
    update: {},
    create: {
      name: 'Aman Singh',
      email: 'customer@velox.dev',
      role: 'CUSTOMER',
      shopId: null,
      passwordHash: customerPassword,
    },
  });

  const existingPrinter1 = await prisma.printer.findFirst({
    where: { name: 'HP LaserJet Pro', shopId: shop.id },
  });
  if (!existingPrinter1) {
    await prisma.printer.create({
      data: {
        name: 'HP LaserJet Pro',
        printerType: 'BLACK_WHITE',
        status: 'ONLINE',
        pagesPerMinute: 30,
        shopId: shop.id,
      },
    });
  }

  const existingPrinter2 = await prisma.printer.findFirst({
    where: { name: 'Canon PIXMA G3010', shopId: shop.id },
  });
  if (!existingPrinter2) {
    await prisma.printer.create({
      data: {
        name: 'Canon PIXMA G3010',
        printerType: 'COLOR',
        status: 'OFFLINE',
        pagesPerMinute: 10,
        shopId: shop.id,
      },
    });
  }

  console.log('Seeding completed successfully!');
  console.log('Seeded 1 shop, 3 users, 2 printers');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
