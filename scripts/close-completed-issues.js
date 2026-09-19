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

const completedIssues = [
  {
    number: 1,
    comment: `Completed and verified in Day 1:
- Exported all domain enums (\`UserRole\`, \`OrderStatus\`, \`PaymentStatus\`, \`PaymentMethod\`, \`PrinterType\`, \`PrinterStatus\`, \`AgentStatus\`, \`AllowedMimeType\`) in \`packages/shared/src/enums\`.
- Exported TypeScript entities and API contracts in \`packages/shared/src/types\`.
- Exported application constants for API, rate limits, upload constraints (50MB, extensions), queue buffer (30s), and Socket.IO events in \`packages/shared/src/constants\`.
- Clean build verified via \`npm run build --workspace=shared\`.`,
  },
  {
    number: 2,
    comment: `Completed and verified in Day 1:
- Implemented Zod validation schemas in \`packages/shared/src/validation\`: \`registerSchema\`, \`loginSchema\`, \`createOrderSchema\`, \`fileUploadSchema\`, \`paginationSchema\`, and \`uuidParamSchema\`.
- Schemas validated with single source of truth across client and server.`,
  },
  {
    number: 4,
    comment: `Completed and verified in Day 1:
- Implemented operational error handling class \`AppError\` with HTTP status codes and operational flags in \`backend/src/utils/app-error.ts\`.
- Implemented global Express error handler middleware \`errorHandler\` returning standardized \`{ success: false, message, error }\` responses.
- Configured structured Pino logger with \`pino-pretty\` in dev and JSON output in production in \`backend/src/config/logger.ts\`.`,
  },
  {
    number: 6,
    comment: `Completed and verified in Day 1:
- Scaffolding of .NET Windows Agent console service completed under \`windows-agent/\`.
- Configured namespaces for Authentication, Connection, Queue, Download, Printer, Printing, Heartbeat, Configuration, Logging, and Utilities.
- Configured \`appsettings.json\` reader with 30s heartbeat interval, shopId, and deviceId.
- Configured Serilog rolling file logger and console sink. Builds cleanly with 0 warnings.`,
  },
  {
    number: 7,
    comment: `Completed and verified in Day 2 & Day 4:
- Implemented Argon2id password hashing in \`backend/src/services/auth.service.ts\`.
- Implemented 15-minute JWT access tokens and 7-day refresh tokens with signing and verification in \`backend/src/config/jwt.ts\`.
- Implemented \`POST /api/v1/auth/register\` and \`POST /api/v1/auth/login\` with standardized API responses.
- Verified with automated unit test suite in \`backend/tests/auth.test.ts\` (all passing).`,
  },
  {
    number: 8,
    comment: `Completed and verified in Day 2:
- Implemented Bearer JWT authentication middleware \`authenticate\` extracting and validating token from \`Authorization\` header in \`backend/src/middlewares/auth.middleware.ts\`.
- Implemented role-based authorization middleware \`authorize(...roles)\` guarding protected routes.
- Correctly returns 401 Unauthorized for missing/invalid tokens and 403 Forbidden for role mismatches.`,
  },
  {
    number: 12,
    comment: `Completed and verified in Day 3:
- Implemented \`POST /api/v1/orders\` with multipart body and file upload in \`backend/src/controllers/order.controller.ts\`.
- Implemented unique cryptographically random order code generation (\`VLX-XXXXXX\`).
- Implemented cost calculation based on copies, pages, color, and sides.
- Implemented atomic Prisma transaction creating Order record with status PENDING and initial \`ORDER_CREATED\` audit event.`,
  },
  {
    number: 14,
    comment: `Completed and verified in Day 3:
- Implemented mobile-first customer QR landing page at \`/shop/[shopId]\` displaying shop details and online printers.
- Implemented print upload flow at \`/shop/[shopId]/upload\` with drag-and-drop document upload and progress bar.
- Implemented full print settings configuration form (copies, color, duplex, orientation, paper size) with instant price estimation.`,
  },
  {
    number: 16,
    comment: `Completed and verified in Day 4:
- Implemented Velox Queue Engine service in \`backend/src/services/queue.service.ts\` and \`backend/src/repositories/queue.repository.ts\`.
- Queue position calculated dynamically: count of active orders (\`WAITING\`, \`ASSIGNED\`, \`DOWNLOADING\`, \`PRINTING\`) created prior to the order for the shop.
- Queue position is never stored as static column; computed on the fly.
- All state transitions and queue updates run in atomic database transactions (\`prisma.$transaction\`).
- Unit tests verified in \`backend/tests/queue.test.ts\`.`,
  },
];

async function closeIssues() {
  console.log(`Starting audit closure for ${completedIssues.length} completed issues...`);

  for (const item of completedIssues) {
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

      // Brief delay to respect rate limits
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`  ❌ Error processing Issue #${item.number}:`, err.message);
    }
  }

  console.log('\nFinished updating GitHub issues!');
}

closeIssues().catch(console.error);
