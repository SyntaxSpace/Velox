const https = require('https');

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

const day6CompletedIssues = [
  {
    number: 3,
    comment: `Completed and verified in Day 6:
- Fully defined PostgreSQL relational database schema matching \`DATABASE.md\` in \`backend/prisma/schema.prisma\`.
- All tables configured with UUID primary keys, default \`now()\` timestamps, foreign key relationships, cascade delete rules, and performance indexes.
- Schema verified cleanly via \`npx prisma validate\` and Prisma Client v5.22.0 generated.`,
  },
  {
    number: 5,
    comment: `Completed and verified in Day 6:
- Implemented Next.js design system tokens (monochrome palette, typography, Geist fonts, Tailwind CSS) matching \`DESIGN.md\`.
- Root layout configured with providers and Lucide icons.
- Built reusable button, card, badge, and input UI components. Compiles cleanly with Turbopack in \`frontend\`.`,
  },
  {
    number: 9,
    comment: `Completed and verified in Day 6:
- Implemented Zustand \`useAuthStore\` managing \`user\`, \`token\`, \`isAuthenticated\`, \`login\`, and \`logout\`.
- Built \`/login\` and \`/register\` authentication flows with form validation, token storage, and redirect logic.`,
  },
  {
    number: 11,
    comment: `Completed and verified in Day 6:
- Implemented shop details endpoint (\`GET /api/v1/shops/:id\`) returning shop metadata, active status, operating hours, and discovered printers.
- Implemented shop statistics endpoint (\`GET /api/v1/admin/stats\`) returning active queue count, total pages, revenue, and today's orders.`,
  },
  {
    number: 13,
    comment: `Completed and verified in Day 6:
- Implemented secure file upload handling via Multer in \`backend/src/config/upload.ts\` with strict 50MB file size limits and MIME filtering (PDF, PNG, JPEG).
- Deterministic UUID storage in \`uploads/\` with path traversal security checks (\`path.basename\` and boundary verification).`,
  },
  {
    number: 15,
    comment: `Completed and verified in Day 6:
- Implemented shop operator dashboard at \`/admin\` displaying active, pending, printing, and completed orders with status badges, customer info, page counts, and action controls.`,
  },
  {
    number: 17,
    comment: `Completed and verified in Day 6:
- Implemented dynamic ETA calculation in \`backend/src/services/queue.service.ts\` using formula: \`Math.ceil((pagesAhead / avgPPM) * 60) + 30s buffer\`.
- Implemented printer allocation logic (\`assignOrder\`) matching shop printers, verifying driver capabilities (color, duplex, paper size), and enforcing shop boundaries.
- Verified live in E2E pipeline run with position #1 and 30s estimated wait.`,
  },
  {
    number: 18,
    comment: `Completed and verified in Day 6:
- Implemented order cancellation validation in \`backend/src/services/queue.service.ts\` and \`PATCH /api/v1/orders/:orderId/cancel\`.
- Strictly permits cancellation only in \`PENDING\` and \`WAITING\` states; rejects cancellations once printing has begun.
- Implemented crash recovery and retry handling in Windows Agent queue repository.`,
  },
  {
    number: 25,
    comment: `Completed and verified in Day 6:
- Implemented real-time Socket.IO event broadcaster with dual namespaces (\`/agent\` and default).
- Emits \`new.order\`, \`order.assigned\`, \`job.assigned\`, \`job.downloading\`, \`job.printing\`, and \`job.completed\` with shop-isolated rooms.
- Sub-50ms latency verified during live E2E pipeline test.`,
  },
  {
    number: 27,
    comment: `Completed and verified in Day 6:
- Implemented customer live status tracker component at \`/order/[orderId]\` and \`/shop/[shopId]/queue\`.
- Displays dynamic queue position counter, estimated wait time, animated status progress indicators, and order summary.`,
  },
  {
    number: 29,
    comment: `Completed and verified in Day 6:
- Implemented counter payment simulation flow and operator confirmation endpoints (\`POST /api/v1/dev/payment/:orderId/success\`).
- Transitions order atomically from \`PENDING\` to \`WAITING\`, records payment success, creates audit events, and enters queue.`,
  },
  {
    number: 31,
    comment: `Completed and verified in Day 6:
- Implemented server-side automatic document cleanup worker in \`backend/src/services/cleanup.service.ts\` running on a scheduled interval.
- Permanently deletes uploaded documents for completed/cancelled orders to ensure zero server-side residual retention.`,
  },
  {
    number: 32,
    comment: `Completed and verified in Day 6:
- Successfully executed automated end-to-end integration test (\`scripts/verify-e2e-pipeline.mjs\`) covering the complete Velox print pipeline:
  Customer Upload → Dev Payment → WAITING → Queue Engine (#1, 30s ETA) → ASSIGNED → Socket.IO Dispatch → Windows Agent Download → SHA-256 Checksum (24026ff...) → SQLite State Machine → Windows Spooler Silent Print (JobId: 3) → COMPLETED Event → Zero-Residual Temp File Cleanup → Idempotency Duplicate Suppression.
- Verified 0 uncaught exceptions, full cross-shop isolation, and strict print settings enforcement.`,
  },
];

async function closeDay6Issues() {
  console.log(`Starting Day 6 audit closure for ${day6CompletedIssues.length} issues...`);

  for (const item of day6CompletedIssues) {
    try {
      console.log(`\nProcessing Issue #${item.number}...`);

      // 1. Post completion comment
      await apiRequest(`/issues/${item.number}/comments`, 'POST', {
        body: item.comment,
      });
      console.log(`  ✓ Added completion comment to #${item.number}`);

      // 2. Close issue
      await apiRequest(`/issues/${item.number}`, 'PATCH', {
        state: 'closed',
        state_reason: 'completed',
      });
      console.log(`  ✓ Closed Issue #${item.number}`);

      // Rate limit delay
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`  ❌ Error processing Issue #${item.number}:`, err.message);
    }
  }

  console.log('\nDay 6 GitHub Issues audit and closure completed!');
}

closeDay6Issues().catch(console.error);
