import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '../backend/node_modules/@prisma/client/index.js';

const BACKEND_URL = 'http://localhost:5000';
const PRINTER_NAME = 'HP LaserJet Professional P1108'; // Physical printer used

async function submitOrder(filePath, demoShop, prisma) {
    console.log(`\n--- Submitting ${path.basename(filePath)} ---`);
    
    // Create guest session
    const guestRes = await fetch(`${BACKEND_URL}/api/v1/public/shops/shop_demo_velox/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'test-device-' + Date.now() }),
    });
    const guestJson = await guestRes.json();
    if (!guestJson.success) throw new Error('Guest auth failed: ' + JSON.stringify(guestJson));
    const sessionToken = guestJson.data.sessionToken;
    
    // Read file
    const pdfBytes = fs.readFileSync(filePath);
    
    // Submit Order
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
    const { orderId, orderCode, estimatedCost } = orderJson.data;
    console.log(`  Order Created: ${orderId} (${orderCode})`);
    
    // Confirm Counter Payment
    const payRes = await fetch(`${BACKEND_URL}/api/v1/dev/payment/${orderId}/success`, { method: 'POST' });
    const payJson = await payRes.json();
    if (!payJson.success) throw new Error('Payment confirmation failed: ' + JSON.stringify(payJson));
    console.log(`  Payment Status: ${payJson.data.paymentStatus}`);
    
    // Assign to Printer (this puts it in queue/dispatch)
    const assignRes = await fetch(`${BACKEND_URL}/api/v1/dev/orders/${orderId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName: PRINTER_NAME }),
    });
    const assignJson = await assignRes.json();
    if (!assignJson.success) throw new Error('Assignment failed: ' + JSON.stringify(assignJson));
    console.log(`  Dispatched to ${PRINTER_NAME}`);
    
    return { orderId, orderCode };
}

async function run() {
    const prisma = new PrismaClient();
    await prisma.$connect();
    const demoShop = await prisma.shop.findUnique({ where: { publicShopId: 'shop_demo_velox' } });
    
    const files = ['Order_A.pdf', 'Order_B.pdf', 'Order_C.pdf', 'Order_D.pdf', 'Order_E.pdf'];
    const results = [];
    
    for (const file of files) {
        const filePath = path.resolve('test-assets/day12', file);
        results.push(await submitOrder(filePath, demoShop, prisma));
        // Small delay to simulate rapid sequential queueing without hitting DB locks too hard
        await new Promise(res => setTimeout(res, 500));
    }
    
    console.log('\n--- ALL SUBMITTED ---');
    console.log(results);
    await prisma.$disconnect();
}

run().catch(console.error);
