import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../backend/node_modules/@prisma/client/index.js';

const BACKEND_URL = 'http://localhost:5000';
const PRINTER_NAME = 'HP LaserJet Professional P1108';

async function createAndPayOrder(filePath, demoShop, sessionToken) {
    const pdfBytes = fs.readFileSync(filePath);
    const formData = new FormData();
    formData.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), path.basename(filePath));
    formData.append('shopId', demoShop.id);
    formData.append('copies', '1');
    formData.append('color', 'bw');
    formData.append('doubleSided', 'false');
    formData.append('orientation', 'portrait');
    formData.append('paperSize', 'A4');
    formData.append('paymentMethod', 'COUNTER');

    const orderRes = await fetch(`${BACKEND_URL}/api/v1/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: formData,
    });
    const orderJson = await orderRes.json();
    if (!orderJson.success) throw new Error('Order creation failed: ' + JSON.stringify(orderJson));
    const orderId = orderJson.data.orderId;
    
    await fetch(`${BACKEND_URL}/api/v1/dev/payment/${orderId}/success`, { method: 'POST' });
    return orderId;
}

async function run() {
    const prisma = new PrismaClient();
    await prisma.$connect();
    const demoShop = await prisma.shop.findUnique({ where: { publicShopId: 'shop_demo_velox' } });
    
    const guestRes = await fetch(`${BACKEND_URL}/api/v1/public/shops/shop_demo_velox/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'cancel-test-' + Date.now() }),
    });
    const sessionToken = (await guestRes.json()).data.sessionToken;

    console.log('--- Submitting A, B, C ---');
    const idA = await createAndPayOrder(path.resolve('test-assets/day12/Order_A.pdf'), demoShop, sessionToken);
    const idB = await createAndPayOrder(path.resolve('test-assets/day12/Order_B.pdf'), demoShop, sessionToken);
    const idC = await createAndPayOrder(path.resolve('test-assets/day12/Order_C.pdf'), demoShop, sessionToken);
    
    console.log(`Orders WAITING: A=${idA}, B=${idB}, C=${idC}`);
    
    console.log(`\n--- Cancelling B (${idB}) ---`);
    const cancelRes = await fetch(`${BACKEND_URL}/api/v1/orders/${idB}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${sessionToken}` }
    });
    console.log('Cancel Response:', await cancelRes.json());
    
    console.log(`\n--- Dispatching A ---`);
    const assignA = await fetch(`${BACKEND_URL}/api/v1/dev/orders/${idA}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ printerName: PRINTER_NAME })
    });
    console.log('Dispatch A:', await assignA.json());

    console.log(`\n--- Dispatching B (Should Fail/Ignore) ---`);
    const assignB = await fetch(`${BACKEND_URL}/api/v1/dev/orders/${idB}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ printerName: PRINTER_NAME })
    });
    console.log('Dispatch B:', await assignB.json());

    console.log(`\n--- Dispatching C ---`);
    const assignC = await fetch(`${BACKEND_URL}/api/v1/dev/orders/${idC}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ printerName: PRINTER_NAME })
    });
    console.log('Dispatch C:', await assignC.json());
    
    await prisma.$disconnect();
}

run().catch(console.error);
