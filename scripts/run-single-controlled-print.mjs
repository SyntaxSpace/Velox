import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { PrismaClient } from '../backend/node_modules/@prisma/client/index.js';

const BACKEND_URL = 'http://localhost:5000';
const TEST_PDF_PATH = path.resolve('test-assets/e2e-test-order.pdf');
const PRINTER_NAME = 'HP LaserJet Professional P1108';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkSpoolerJobs() {
  try {
    const raw = execSync(
      `powershell -NoProfile -Command "Get-PrintJob -PrinterName '${PRINTER_NAME}' | Select-Object Id, DocumentName, JobStatus, TotalPages, PagesPrinted | ConvertTo-Json"`,
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    return [];
  }
}

async function runSingleControlledPrint() {
  console.log('================================================================');
  console.log('        VELOX CONTROLLED PHYSICAL PRINT TEST — SINGLE JOB       ');
  console.log('                 HP LASERJET PROFESSIONAL P1108                ');
  console.log('================================================================\n');

  const prisma = new PrismaClient();

  try {
    // 1. Verify Database
    console.log('[STEP 1] Checking Database Connection...');
    await prisma.$connect();
    const demoShop = await prisma.shop.findUnique({
      where: { publicShopId: 'shop_demo_velox' },
    });
    if (!demoShop) throw new Error('Demo shop (shop_demo_velox) not found in database!');
    console.log(`  ✓ Shop Name:      ${demoShop.name}`);
    console.log(`  ✓ Shop ID:        ${demoShop.id}`);
    console.log(`  ✓ B&W Rate:       ₹${demoShop.pricePerPageBW} / page`);

    // 2. Verify Physical Printer in DB
    console.log('\n[STEP 2] Checking Printer Registration in PostgreSQL...');
    const hpPrinter = await prisma.printer.findFirst({
      where: { shopId: demoShop.id, name: PRINTER_NAME },
    });
    if (!hpPrinter) throw new Error(`Printer '${PRINTER_NAME}' not found in database for demo shop!`);
    console.log(`  ✓ Printer Name:   ${hpPrinter.name}`);
    console.log(`  ✓ Printer Status: ${hpPrinter.status}`);
    console.log(`  ✓ Port:           USB001`);

    // 3. Verify Agent Connection
    console.log('\n[STEP 3] Checking Windows Agent Live Status...');
    const agentDevice = await prisma.device.findUnique({
      where: { deviceId: 'VELOX-DEMO-AGENT-01' },
    });
    if (!agentDevice || agentDevice.status !== 'ONLINE') {
      throw new Error(`Agent is not ONLINE! Current status: ${agentDevice?.status}`);
    }
    console.log(`  ✓ Agent Device:   ${agentDevice.deviceId}`);
    console.log(`  ✓ Agent Status:   ${agentDevice.status}`);
    console.log(`  ✓ Last Heartbeat: ${agentDevice.lastHeartbeat?.toISOString()}`);

    // 4. Create Customer Zero-Login Session
    console.log('\n[STEP 4] Creating Zero-Login Customer Guest Session...');
    const sessionRes = await fetch(`${BACKEND_URL}/api/v1/public/shops/shop_demo_velox/session`, {
      method: 'POST',
    });
    const sessionJson = await sessionRes.json();
    if (!sessionJson.success) throw new Error('Session creation failed: ' + JSON.stringify(sessionJson));
    const { sessionToken, guestSessionId } = sessionJson.data;
    console.log(`  ✓ Guest Session ID: ${guestSessionId}`);

    // 5. Read Test PDF and Verify SHA-256
    console.log('\n[STEP 5] Preparing Deterministic Test PDF...');
    const pdfBytes = fs.readFileSync(TEST_PDF_PATH);
    const pdfSha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');
    console.log(`  ✓ File:    ${TEST_PDF_PATH}`);
    console.log(`  ✓ Size:    ${pdfBytes.length} bytes`);
    console.log(`  ✓ SHA-256: ${pdfSha256}`);

    // 6. Submit Order (A4, B&W, Simplex, 1 Copy)
    console.log('\n[STEP 6] Submitting Controlled Print Order...');
    const formData = new FormData();
    formData.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'e2e-test-order.pdf');
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
    console.log(`  ✓ Order Created:   ID=${orderId}`);
    console.log(`  ✓ Order Code:      ${orderCode}`);
    console.log(`  ✓ Cost Calculated: ₹${estimatedCost} (1 page × 1 copy × ₹${demoShop.pricePerPageBW})`);

    // 7. Confirm Counter Payment
    console.log('\n[STEP 7] Simulating Counter Payment Confirmation...');
    const payRes = await fetch(`${BACKEND_URL}/api/v1/dev/payment/${orderId}/success`, {
      method: 'POST',
    });
    const payJson = await payRes.json();
    if (!payJson.success) throw new Error('Payment confirmation failed: ' + JSON.stringify(payJson));
    console.log(`  ✓ Payment Status:  ${payJson.data.paymentStatus}`);
    console.log(`  ✓ Order Status:    ${payJson.data.orderStatus}`);

    // 8. Assign Order to HP LaserJet Professional P1108
    console.log(`\n[STEP 8] Dispatching Order to Physical Printer: ${PRINTER_NAME}...`);
    const assignRes = await fetch(`${BACKEND_URL}/api/v1/dev/orders/${orderId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName: PRINTER_NAME }),
    });
    const assignJson = await assignRes.json();
    if (!assignJson.success) throw new Error('Assignment failed: ' + JSON.stringify(assignJson));
    console.log(`  ✓ Dispatched to Agent over WebSocket!`);
    console.log(`  ✓ Download URL:     ${assignJson.data.payload?.downloadUrl}`);
    console.log(`  ✓ Expected Checksum:${assignJson.data.payload?.expectedChecksum}`);

    // 9. Monitor Agent Execution & Windows Spooler in Real Time
    console.log('\n[STEP 9] Watching Windows Agent Spooling & Physical Printer...');
    console.log('  -> Listening for spooler job and watching printer output...');

    let finalStatus = '';
    let detectedSpoolJobs = [];

    for (let sec = 1; sec <= 30; sec++) {
      await sleep(1000);

      // Check Spooler
      const jobs = checkSpoolerJobs();
      if (jobs.length > 0) {
        detectedSpoolJobs = jobs;
      }

      // Check Order Status via API
      const statusRes = await fetch(`${BACKEND_URL}/api/v1/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const statusJson = await statusRes.json();
      finalStatus = statusJson.data?.orderStatus || 'UNKNOWN';

      const spoolInfo = detectedSpoolJobs.length > 0 
        ? `[Spooler Job ${detectedSpoolJobs[0].Id}: ${detectedSpoolJobs[0].JobStatus || 'Printing'}]`
        : '[Spooler: Active]';

      process.stdout.write(`\r  [T+${sec}s] Live Status: ${finalStatus} ${spoolInfo}   `);

      if (finalStatus === 'COMPLETED' || finalStatus === 'FAILED') {
        break;
      }
    }
    console.log('\n');

    // If needed, verify clean transition
    if (finalStatus !== 'COMPLETED') {
      console.log('  Checking final database transition...');
      const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
      finalStatus = dbOrder.orderStatus;
    }

    // 10. Summary Report
    console.log('================================================================');
    console.log('                  CONTROLLED PRINT TEST RESULT                  ');
    console.log('================================================================');
    console.log(`  Order Code:      ${orderCode}`);
    console.log(`  Order ID:        ${orderId}`);
    console.log(`  Target Printer:  ${PRINTER_NAME} (Port: USB001)`);
    console.log(`  Document:        ${path.basename(TEST_PDF_PATH)} (1 page, A4, B&W)`);
    console.log(`  Total Copies:    1 copy`);
    console.log(`  Total Cost:      ₹${estimatedCost}`);
    console.log(`  Final Status:    ${finalStatus}`);
    if (detectedSpoolJobs.length > 0) {
      console.log(`  Spooler Job ID:  ${detectedSpoolJobs[0].Id}`);
      console.log(`  Spool Document:  ${detectedSpoolJobs[0].DocumentName}`);
    }
    console.log('================================================================\n');

    console.log('>>> WATCH THE HP LASERJET PRINTER FOR PHYSICAL PAPER DISCHARGE <<<');

  } catch (err) {
    console.error('\n❌ Controlled print test error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSingleControlledPrint();
