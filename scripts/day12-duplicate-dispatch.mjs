import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../backend/node_modules/@prisma/client/index.js';

const BACKEND_URL = 'http://localhost:5000';
const PRINTER_NAME = 'HP LaserJet Professional P1108';

async function run() {
    const prisma = new PrismaClient();
    await prisma.$connect();
    const demoShop = await prisma.shop.findUnique({ where: { publicShopId: 'shop_demo_velox' } });
    
    const guestRes = await fetch(`${BACKEND_URL}/api/v1/public/shops/shop_demo_velox/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'duplicate-test-' + Date.now() }),
    });
    const sessionToken = (await guestRes.json()).data.sessionToken;

    // Create Order
    const pdfBytes = fs.readFileSync(path.resolve('test-assets/day12/Order_D.pdf'));
    const formData = new FormData();
    formData.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'Order_D.pdf');
    formData.append('shopId', demoShop.id);
    formData.append('copies', '1');
    formData.append('color', 'bw');
    formData.append('doubleSided', 'false');
    formData.append('orientation', 'portrait');
    formData.append('paperSize', 'A4');
    formData.append('paymentMethod', 'COUNTER');

    let orderRes = await fetch(`${BACKEND_URL}/api/v1/orders`, {
      method: 'POST', headers: { Authorization: `Bearer ${sessionToken}` }, body: formData,
    });
    const orderId = (await orderRes.json()).data.orderId;
    await fetch(`${BACKEND_URL}/api/v1/dev/payment/${orderId}/success`, { method: 'POST' });
    
    console.log(`\n--- First Dispatch of ${orderId} ---`);
    const assign1 = await fetch(`${BACKEND_URL}/api/v1/dev/orders/${orderId}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ printerName: PRINTER_NAME })
    });
    console.log(await assign1.json());

    console.log(`\n--- Second Dispatch (DUPLICATE) of ${orderId} ---`);
    const assign2 = await fetch(`${BACKEND_URL}/api/v1/dev/orders/${orderId}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ printerName: PRINTER_NAME })
    });
    console.log(await assign2.json());
    
    await prisma.$disconnect();
}

run().catch(console.error);
