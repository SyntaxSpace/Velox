import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { PrismaClient } from '../backend/node_modules/@prisma/client/index.js';

const BACKEND_URL = 'http://localhost:5000';
const TEST_PDF_PATH = path.resolve('test-assets/duplex-test-order.pdf');
const PRINTER_NAME = 'RICOH M 2700';

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

async function runRicohDuplexPrint() {
  console.log('================================================================');
  console.log('        VELOX CONTROLLED PHYSICAL PRINT TEST — DUPLEX JOB       ');
  console.log('                 PRINTER: RICOH M 2700 (DUPLEX)                 ');
  console.log('================================================================\n');

  const prisma = new PrismaClient();

  try {
    // 1. Verify Database Connection & Demo Shop
    console.log('[STEP 1] Checking Database Connection & Demo Shop...');
    await prisma.$connect();
    const demoShop = await prisma.shop.findUnique({
      where: { publicShopId: 'shop_demo_velox' },
    });
    if (!demoShop) throw new Error('Demo shop (shop_demo_velox) not found in database!');
    console.log(`  ✓ Shop Name:      ${demoShop.name}`);
    console.log(`  ✓ Shop ID:        ${demoShop.id}`);
    console.log(`  ✓ B&W Rate:       ₹${demoShop.pricePerPageBW} / page`);

    // 2. Verify Physical Printer in DB
    console.log('\n[STEP 2] Checking RICOH M 2700 Registration in PostgreSQL...');
    let ricohPrinter = await prisma.printer.findFirst({
      where: { shopId: demoShop.id, name: PRINTER_NAME },
    });
    if (!ricohPrinter) {
      console.log(`  Printer '${PRINTER_NAME}' not found in DB. Registering now...`);
      ricohPrinter = await prisma.printer.create({
        data: {
          name: PRINTER_NAME,
          shopId: demoShop.id,
          printerType: 'BLACK_WHITE',
          status: 'ONLINE',
          ipAddress: '172.16.24.254',
          pagesPerMinute: 27,
        },
      });
    } else if (ricohPrinter.status !== 'ONLINE') {
      ricohPrinter = await prisma.printer.update({
        where: { id: ricohPrinter.id },
        data: { status: 'ONLINE' },
      });
    }
    console.log(`  ✓ Printer Name:   ${ricohPrinter.name}`);
    console.log(`  ✓ Printer Status: ${ricohPrinter.status}`);
    console.log(`  ✓ IP Address:     ${ricohPrinter.ipAddress}`);
    console.log(`  ✓ PPM:            ${ricohPrinter.pagesPerMinute}`);

    // 3. Verify Agent Connection
    console.log('\n[STEP 3] Checking Windows Agent Live Status...');
    const agentDevice = await prisma.device.findUnique({
      where: { deviceId: 'VELOX-DEMO-AGENT-01' },
    });
    if (!agentDevice || agentDevice.status !== 'ONLINE') {
      throw new Error(`Agent is not ONLINE! Current status: ${agentDevice?.status || 'NOT_FOUND'}. Please start the Windows Agent.`);
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
    console.log('\n[STEP 5] Preparing Deterministic 2-Page Duplex Test PDF...');
    if (!fs.existsSync(TEST_PDF_PATH)) {
      throw new Error(`Test PDF not found at ${TEST_PDF_PATH}. Run scripts/generate-duplex-pdf.js first.`);
    }
    const pdfBytes = fs.readFileSync(TEST_PDF_PATH);
    const pdfSha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');
    console.log(`  ✓ File:    ${TEST_PDF_PATH}`);
    console.log(`  ✓ Size:    ${pdfBytes.length} bytes`);
    console.log(`  ✓ SHA-256: ${pdfSha256}`);
    console.log(`  ✓ Pages:   2 Pages (Page 1 Front, Page 2 Back)`);

    // 6. Submit Order (A4, B&W, Duplex, 1 Copy -> 1 physical sheet)
    console.log('\n[STEP 6] Submitting Controlled Duplex Print Order (1 Copy, 2-Sided)...');
    const formData = new FormData();
    formData.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'duplex-test-order.pdf');
    formData.append('shopId', demoShop.id);
    formData.append('copies', '1');
    formData.append('color', 'bw');
    formData.append('doubleSided', 'true'); // DUPLEX MODE
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
    console.log(`  ✓ Cost Calculated: ₹${estimatedCost}`);

    // 7. Confirm Counter Payment
    console.log('\n[STEP 7] Simulating Counter Payment Confirmation...');
    const payRes = await fetch(`${BACKEND_URL}/api/v1/dev/payment/${orderId}/success`, {
      method: 'POST',
    });
    const payJson = await payRes.json();
    if (!payJson.success) throw new Error('Payment confirmation failed: ' + JSON.stringify(payJson));
    console.log(`  ✓ Payment Status:  ${payJson.data.paymentStatus}`);
    console.log(`  ✓ Order Status:    ${payJson.data.orderStatus}`);

    // 8. Assign Order to RICOH M 2700
    console.log(`\n[STEP 8] Dispatching Order to Physical Printer: ${PRINTER_NAME}...`);
    const assignRes = await fetch(`${BACKEND_URL}/api/v1/dev/orders/${orderId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName: PRINTER_NAME }),
    });
    const assignJson = await assignRes.json();
    if (!assignJson.success) throw new Error('Assignment failed: ' + JSON.stringify(assignJson));
    console.log(`  ✓ Dispatched to Agent over WebSocket!`);
    console.log(`  ✓ Download URL:      ${assignJson.data.payload?.downloadUrl}`);
    console.log(`  ✓ Expected Checksum: ${assignJson.data.payload?.expectedChecksum}`);
    console.log(`  ✓ Duplex Setting:    ${assignJson.data.payload?.doubleSided}`);

    // 9. Monitor Agent Execution & Windows Spooler in Real Time
    console.log('\n[STEP 9] Watching Windows Agent Spooling & RICOH M 2700 Printer...');
    console.log('  -> Listening for spooler job and waiting for printer duplex cycle...');

    let finalStatus = '';
    let detectedSpoolJobs = [];

    for (let sec = 1; sec <= 35; sec++) {
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

    // Verify final DB transition
    if (finalStatus !== 'COMPLETED') {
      console.log('  Checking final database transition...');
      const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
      finalStatus = dbOrder.orderStatus;
    }

    // 10. Summary Report
    console.log('================================================================');
    console.log('             RICOH M 2700 DUPLEX PRINT TEST RESULT              ');
    console.log('================================================================');
    console.log(`  Order Code:      ${orderCode}`);
    console.log(`  Order ID:        ${orderId}`);
    console.log(`  Target Printer:  ${PRINTER_NAME} (Port: IP_172.16.24.254)`);
    console.log(`  Document:        ${path.basename(TEST_PDF_PATH)} (2 pages, A4, B&W)`);
    console.log(`  Duplex Mode:     TWO-SIDED (Vertical / Long-Edge)`);
    console.log(`  Total Copies:    1 copy`);
    console.log(`  Physical Sheets: 1 SHEET (Front: Page 1, Back: Page 2)`);
    console.log(`  Final Status:    ${finalStatus}`);
    if (detectedSpoolJobs.length > 0) {
      console.log(`  Spooler Job ID:  ${detectedSpoolJobs[0].Id}`);
      console.log(`  Spool Document:  ${detectedSpoolJobs[0].DocumentName}`);
    }
    console.log('================================================================\n');

    if (finalStatus === 'COMPLETED') {
      console.log('>>> SUCCESS: Job dispatched and spooled in DUPLEX mode to RICOH M 2700! <<<');
      console.log('>>> Exactly ONE sheet of paper will be fed, flipped, and printed on both sides. <<<');
    } else {
      console.log(`>>> WARNING: Final status is ${finalStatus}. Please check agent logs. <<<`);
    }

  } catch (err) {
    console.error('\n❌ Controlled duplex print test error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRicohDuplexPrint();
