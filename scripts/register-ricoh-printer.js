const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function registerRicoh() {
  console.log('Connecting to PostgreSQL to register RICOH M 2700...');
  await prisma.$connect();

  const shop = await prisma.shop.findUnique({
    where: { publicShopId: 'shop_demo_velox' },
  });

  if (!shop) {
    throw new Error('Demo shop (shop_demo_velox) not found!');
  }

  console.log(`Demo Shop found: ${shop.name} (${shop.id})`);

  let ricoh = await prisma.printer.findFirst({
    where: {
      shopId: shop.id,
      name: 'RICOH M 2700',
    },
  });

  const ricohData = {
    name: 'RICOH M 2700',
    shopId: shop.id,
    printerType: 'BLACK_WHITE',
    status: 'ONLINE',
    ipAddress: '172.16.24.254',
    pagesPerMinute: 27,
  };

  if (!ricoh) {
    ricoh = await prisma.printer.create({
      data: ricohData,
    });
    console.log(`✓ Created RICOH M 2700 in database! (ID: ${ricoh.id})`);
  } else {
    ricoh = await prisma.printer.update({
      where: { id: ricoh.id },
      data: ricohData,
    });
    console.log(`✓ Updated RICOH M 2700 in database! (ID: ${ricoh.id})`);
  }

  const allPrinters = await prisma.printer.findMany({
    where: { shopId: shop.id },
  });

  console.log('\nAll registered printers for Velox Demo Shop:');
  for (const p of allPrinters) {
    console.log(
      `  - [${p.status}] ${p.name} | Type: ${p.printerType} | Speed: ${p.pagesPerMinute} PPM | Duplex: ${p.supportsDuplex}`,
    );
  }
}

registerRicoh()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
