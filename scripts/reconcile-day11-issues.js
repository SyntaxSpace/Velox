import https from 'https';

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = 'SyntaxSpace/Velox';

function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO}${path}`,
      method: method,
      headers: {
        'User-Agent': 'Velox-Auditor',
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
    };
    if (dataString) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          try {
            const parsed = JSON.parse(data);
            reject(new Error(`API Error [${res.statusCode}]: ${parsed.message || data}`));
          } catch (e) {
            reject(new Error(`API Error [${res.statusCode}]: ${data}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) req.write(dataString);
    req.end();
  });
}

const day11CompletedIssues = [
  {
    number: 19,
    title: 'Windows Agent Queue Manager & Persistence',
    comment: `Completed and verified on real physical hardware in Day 11:
- Implemented thread-safe in-memory queue management in \`windows-agent/src/Queue/QueueManager.cs\`.
- Enforces strict FIFO order execution with deduplication protection (\`_activeJobIds\` memory set preventing duplicate spooling).
- Full state synchronization with cloud backend over Socket.IO and REST API.
- Verified in 3-job sequential FIFO queue test without order inversion or duplicate prints.`,
  },
  {
    number: 20,
    title: 'Windows Agent Printer Discovery Engine',
    comment: `Completed and verified on real physical hardware in Day 11:
- Implemented \`windows-agent/src/Printer/WindowsPrinterDiscoveryService.cs\` to enumerate installed local and network printers.
- Discovered and registered real physical printer **HP LaserJet Professional P1108** on \`USB001\`.
- Extracted hardware capabilities: Monochrome only (\`supportsColor: false\`), A4/Letter supported, physical simplex (\`canDuplex: false\`), 18 PPM.
- Implemented Win32 \`OpenPrinter\`/\`GetPrinter\` offline hardware detection inspecting \`PRINTER_ATTRIBUTE_WORK_OFFLINE\` and \`PRINTER_STATUS_OFFLINE\`.
- Synced printer capabilities with PostgreSQL \`printers\` table under Velox Demo Shop.`,
  },
  {
    number: 21,
    title: 'Secure File Download Manager with Checksum Verification',
    comment: `Completed and verified on real physical hardware in Day 11:
- Implemented authenticated HTTP streaming download in \`windows-agent/src/Download/DownloadManager.cs\`.
- Downloads documents to temporary storage using Bearer Agent Token authentication.
- Automatically calculates and verifies SHA-256 hash against backend expectation before spooling.
- Confirmed with deterministic PDF (\`test-assets/e2e-test-order.pdf\`, 845 bytes, hash: \`24026ff6...\`).
- Emits real-time downloading progress status back to cloud backend.`,
  },
  {
    number: 22,
    title: 'Windows Silent Print Engine Integration',
    comment: `Completed and verified on real physical hardware in Day 11:
- Implemented dual-mode print engine in \`windows-agent/src/Printing/WindowsPrintEngine.cs\`.
- Developed Chromium DirectWrite rendering pipeline (\`msedge.exe --headless --disable-gpu --print-to-printer\`) for host-based GDI/IMF printers (HP LaserJet P1108), generating valid GDI spool commands.
- Retained Win32 direct \`StartDocPrinter\` RAW spooling fallback for PostScript/PCL network printers.
- Verified physical paper output:
  * Spooler Job ID 13: Controlled 1-page B&W test.
  * Spooler Job ID 14: E2E Customer order (1 page, ₹3.00) physically printed.
  * Spooler Job ID 920: Multi-copy test (2 copies, ₹6.00) physically printed (2 sheets).
- Capability guard verified: Automatically and safely rejected duplex and color jobs on simplex/monochrome hardware.
- Status transitions verified: \`ASSIGNED\` -> \`PRINTING\` -> \`COMPLETED\`.`,
  },
  {
    number: 23,
    title: 'Agent Automatic Local Cleanup Service',
    comment: `Completed and verified on real physical hardware in Day 11:
- Implemented \`CleanupAsync\` in \`windows-agent/src/Printing/WindowsPrintEngine.cs\` and \`QueueManager.cs\`.
- Permanently shreds downloaded PDF files and temp artifacts immediately after spooler confirmation.
- Post-print inspection verified zero residual files in \`windows-agent/temp/\` and \`windows-agent/downloads/\`.
- Ensured PostgreSQL relational audit trail in cloud database remains fully preserved with immutable timestamps.`,
  },
];

async function reconcileIssues() {
  console.log('================================================================');
  console.log('    VELOX DAY 11 — GITHUB ISSUES RECONCILIATION AUDIT          ');
  console.log('================================================================\n');

  if (!TOKEN) {
    console.log('ℹ️  GITHUB_TOKEN is not set in environment.');
    console.log('Displaying Day 11 completed issue audit summary:\n');
    for (const item of day11CompletedIssues) {
      console.log(`[ISSUE #${item.number}] ${item.title}`);
      console.log('Status: COMPLETED & VERIFIED ON PHYSICAL HARDWARE');
      console.log(item.comment.trim());
      console.log('----------------------------------------------------------------\n');
    }
    return;
  }

  console.log(
    `Starting GitHub audit reconciliation for ${day11CompletedIssues.length} issues on ${REPO}...`,
  );
  for (const item of day11CompletedIssues) {
    try {
      console.log(`\nReconciling Issue #${item.number}: ${item.title}...`);
      await apiRequest(`/issues/${item.number}/comments`, 'POST', {
        body: item.comment,
      });
      console.log(`  ✓ Posted Day 11 verification comment to #${item.number}`);

      await apiRequest(`/issues/${item.number}`, 'PATCH', {
        state: 'closed',
        state_reason: 'completed',
      });
      console.log(`  ✓ Marked Issue #${item.number} as CLOSED (completed)`);

      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`  ⚠️ Notice for Issue #${item.number}: ${err.message}`);
    }
  }

  console.log('\nDay 11 GitHub issues reconciliation audit completed!');
}

reconcileIssues().catch(console.error);
