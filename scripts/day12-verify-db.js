const { PrismaClient } = require('../backend/node_modules/@prisma/client/index.js');
const prisma = new PrismaClient();

async function run() {
  // Check totals
  const totalOrders = await prisma.order.count({
    where: { shopId: '848c0425-ba7c-4d27-b340-4ab4e63a3ee4' },
  });
  const completedOrders = await prisma.order.count({ where: { orderStatus: 'COMPLETED' } });
  const cancelledOrders = await prisma.order.count({ where: { orderStatus: 'CANCELLED' } });
  const waitingOrders = await prisma.order.count({ where: { orderStatus: 'WAITING' } });
  const failedOrders = await prisma.order.count({ where: { orderStatus: 'FAILED' } });

  console.log(`\n--- SHOP ORDER STATS ---`);
  console.log(
    `Total: ${totalOrders}, Completed: ${completedOrders}, Cancelled: ${cancelledOrders}, Failed: ${failedOrders}, Waiting: ${waitingOrders}`,
  );

  // Check one of the completed orders
  const compOrder = await prisma.order.findFirst({
    where: { orderStatus: 'COMPLETED' },
    include: { events: true, payment: true, transactions: true, files: true },
  });
  if (compOrder) {
    console.log(`\n--- COMPLETED ORDER AUDIT (${compOrder.orderCode}) ---`);
    console.log(`Price: ₹${compOrder.totalPrice} | Pages: ${compOrder.totalPages}`);
    console.log(`Payment: ${compOrder.payment?.status} | Amount: ₹${compOrder.payment?.amount}`);
    if (compOrder.transactions && compOrder.transactions.length > 0) {
      console.log(
        `Transaction: ${compOrder.transactions[0].type} | Amount: ₹${compOrder.transactions[0].amount}`,
      );
    }
    console.log(`Events:`);
    compOrder.events.forEach((e) => console.log(`  - ${e.event} (${e.createdAt})`));
  }

  // Check one of the cancelled orders
  const cancOrder = await prisma.order.findFirst({
    where: { orderStatus: 'CANCELLED' },
    include: { events: true },
  });
  if (cancOrder) {
    console.log(`\n--- CANCELLED ORDER AUDIT (${cancOrder.orderCode}) ---`);
    console.log(`Events:`);
    cancOrder.events.forEach((e) => console.log(`  - ${e.event} (${e.createdAt})`));
  }

  await prisma.$disconnect();
}
run().catch(console.error);
