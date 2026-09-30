const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));

async function main() {
  console.log('================================================================');
  console.log('                VELOX DEMO ENVIRONMENT SAFE RESET               ');
  console.log('================================================================\n');

  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    console.error('❌ SAFETY ABORT: demo:reset cannot be executed in production environment!');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log('[1/4] Connecting to PostgreSQL database...');
    await prisma.$connect();
    console.log('      Connected successfully.');

    console.log('[2/4] Clearing Demo Shop orders and transactional records...');
    const demoShop = await prisma.shop.findFirst({
      where: { name: 'Velox Demo Shop' },
    });

    if (demoShop) {
      // Find orders for demo shop
      const orders = await prisma.order.findMany({
        where: { shopId: demoShop.id },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);

      if (orderIds.length > 0) {
        await prisma.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.orderFile.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.transaction.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
        console.log(`      Cleared ${orderIds.length} demo orders and related records.`);
      } else {
        console.log('      No previous demo orders found.');
      }

      // Reset device status to OFFLINE
      await prisma.device.updateMany({
        where: { shopId: demoShop.id },
        data: { status: 'OFFLINE', lastHeartbeat: null },
      });
      console.log('      Reset demo agent devices to OFFLINE.');
    }

    console.log('[3/4] Cleaning local temporary spool and download files...');
    const tempDirs = [
      path.resolve(__dirname, '../windows-agent/temp'),
      path.resolve(__dirname, '../windows-agent/downloads'),
      path.resolve(__dirname, '../backend/uploads'),
    ];
    for (const d of tempDirs) {
      if (fs.existsSync(d)) {
        const files = fs.readdirSync(d).filter((f) => f !== '.gitkeep');
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(d, file));
          } catch {}
        }
      }
    }
    console.log('      Temporary files cleaned.');

    console.log('[4/4] Ensuring canonical Demo Shop, Partner, and Agent records...');
    execSync('npx tsx prisma/seed.ts', {
      cwd: path.resolve(__dirname, '../backend'),
      stdio: 'inherit',
    });

    console.log('\n================================================================');
    console.log('✅ DEMO ENVIRONMENT RESET COMPLETED SUCCESSFULLY!');
    console.log('   - Database: Cleaned & Reseeded');
    console.log('   - Demo Shop: Velox Demo Shop (Chhatrapati Sambhajinagar)');
    console.log('   - Pricing: B&W ₹3.00, Color ₹12.00, Duplex ₹0.75');
    console.log('   - Agent: VELOX-DEMO-AGENT-01 (OFFLINE)');
    console.log('   - Queue: Empty (Ready for new orders)');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Reset error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
