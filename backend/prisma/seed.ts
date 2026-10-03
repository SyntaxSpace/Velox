import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('The demo seed is restricted to NODE_ENV=development.');
  }

  console.log('Starting seed...');

  const shop = await prisma.shop.upsert({
    where: { qrCode: 'shop_quickprint_hub' },
    update: {},
    create: {
      name: 'QuickPrint Hub',
      publicShopId: 'shop_quickprint_hub',
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

  console.log('Seeded base shop, 3 users, 2 printers');

  // ────────────────────────────────────────────────────────────────
  // DAY 10 CANONICAL DEMO ENVIRONMENT SEEDING
  // ────────────────────────────────────────────────────────────────
  console.log('Seeding Day 10 Canonical Demo Environment...');

  // 1. Partner Account (partner@velox.dev)
  const partnerPassword = await argon2.hash(
    process.env.DEV_PARTNER_PASSWORD || 'PartnerSecure2026!',
    {
      type: argon2.argon2id,
    },
  );
  const partner = await prisma.user.upsert({
    where: { email: 'partner@velox.dev' },
    update: {
      passwordHash: partnerPassword,
      role: 'PARTNER',
      firstLogin: false,
    },
    create: {
      name: 'Velox Central Partner',
      email: 'partner@velox.dev',
      role: 'PARTNER',
      passwordHash: partnerPassword,
      firstLogin: false,
      phone: '+91 99999 00000',
    },
  });
  console.log(`- Partner seeded: ${partner.email} (ID: ${partner.id})`);

  // 2. Platform Admin (admin@velox.dev)
  const adminPassword = await argon2.hash(process.env.DEV_ADMIN_PASSWORD || 'AdminSecure2026!', {
    type: argon2.argon2id,
  });
  await prisma.user.upsert({
    where: { email: 'admin@velox.dev' },
    update: {
      passwordHash: adminPassword,
      role: 'ADMIN',
      firstLogin: false,
    },
    create: {
      name: 'Velox Admin',
      email: 'admin@velox.dev',
      role: 'ADMIN',
      passwordHash: adminPassword,
      firstLogin: false,
      phone: '+91 99999 11111',
    },
  });

  // 3. Shop Owner Account (demo.owner@velox.dev)
  const ownerTempPassword = await argon2.hash(
    process.env.DEV_OWNER_TEMP_PASSWORD || 'TempPassword2026!',
    {
      type: argon2.argon2id,
    },
  );
  const demoOwner = await prisma.user.upsert({
    where: { email: 'demo.owner@velox.dev' },
    update: {
      passwordHash: ownerTempPassword,
      role: 'SHOP_OWNER',
      firstLogin: true,
    },
    create: {
      name: 'Ramesh Joshi',
      email: 'demo.owner@velox.dev',
      role: 'SHOP_OWNER',
      passwordHash: ownerTempPassword,
      firstLogin: true,
      phone: '+91 98765 00010',
    },
  });
  console.log(`- Demo Shop Owner seeded: ${demoOwner.email} (firstLogin: true)`);

  // 4. Canonical "Velox Demo Shop" (Chhatrapati Sambhajinagar)
  const demoShop = await prisma.shop.upsert({
    where: { qrCode: 'velox:shop:shop_demo_velox' },
    update: {
      name: 'Velox Demo Shop',
      publicShopId: 'shop_demo_velox',
      city: 'Chhatrapati Sambhajinagar',
      address: 'Plot 12, Station Road, Chhatrapati Sambhajinagar, MH 431005',
      pincode: '431005',
      phone: '9876500010',
      email: 'counter@veloxdemoshop.com',
      operatingHours: '8:00 AM - 10:00 PM',
      status: 'ACTIVE',
      pricePerPageBW: 3.0,
      pricePerPageColor: 12.0,
      duplexDiscount: 0.75,
      createdByPartnerId: partner.id,
      ownerId: demoOwner.id,
    },
    create: {
      name: 'Velox Demo Shop',
      publicShopId: 'shop_demo_velox',
      qrCode: 'velox:shop:shop_demo_velox',
      city: 'Chhatrapati Sambhajinagar',
      address: 'Plot 12, Station Road, Chhatrapati Sambhajinagar, MH 431005',
      pincode: '431005',
      phone: '9876500010',
      email: 'counter@veloxdemoshop.com',
      operatingHours: '8:00 AM - 10:00 PM',
      status: 'ACTIVE',
      pricePerPageBW: 3.0,
      pricePerPageColor: 12.0,
      duplexDiscount: 0.75,
      createdByPartnerId: partner.id,
      ownerId: demoOwner.id,
    },
  });
  console.log(
    `- Velox Demo Shop seeded: ${demoShop.name} (Public ID: ${demoShop.publicShopId}, ID: ${demoShop.id})`,
  );

  // Link owner to shopId
  await prisma.user.update({
    where: { id: demoOwner.id },
    data: { shopId: demoShop.id },
  });

  // 5. Canonical Demo Agent Device (VELOX-DEMO-AGENT-01)
  const demoDevice = await prisma.device.upsert({
    where: { deviceId: 'VELOX-DEMO-AGENT-01' },
    update: {
      shopId: demoShop.id,
      name: 'Velox Demo Counter Agent',
      deviceKey: 'agent_secret_key_demo_2026',
    },
    create: {
      shopId: demoShop.id,
      deviceId: 'VELOX-DEMO-AGENT-01',
      name: 'Velox Demo Counter Agent',
      deviceKey: 'agent_secret_key_demo_2026',
      status: 'OFFLINE',
    },
  });
  console.log(`- Demo Device registered: ${demoDevice.deviceId} bound to ${demoShop.name}`);

  // 6. Printers for Velox Demo Shop
  const demoPrinters = [
    { name: 'RICOH M 2700', type: 'BLACK_WHITE' as const, ppm: 27, ipAddress: '172.16.24.254' },
    { name: 'HP LaserJet Professional P1108', type: 'BLACK_WHITE' as const, ppm: 18 },
    { name: 'OneNote (Desktop)', type: 'COLOR' as const, ppm: 15 },
    { name: 'Microsoft Print to PDF', type: 'COLOR' as const, ppm: 20 },
  ];
  for (const dp of demoPrinters) {
    const existing = await prisma.printer.findFirst({
      where: { shopId: demoShop.id, name: dp.name },
    });
    if (!existing) {
      await prisma.printer.create({
        data: {
          shopId: demoShop.id,
          name: dp.name,
          printerType: dp.type,
          status: 'ONLINE',
          pagesPerMinute: dp.ppm,
        },
      });
    }
  }
  console.log(`- Seeded printers for ${demoShop.name}`);

  console.log('\n✅ All database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
