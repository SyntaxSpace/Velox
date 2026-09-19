/**
 * Velox — GitHub Population Script
 * Automatically creates all Labels, Milestones, and 32 Detailed Issues on GitHub repo SyntaxSpace/Velox
 */

const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = 'SyntaxSpace/Velox';

function apiRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO}${path}`,
      method: method,
      headers: {
        'User-Agent': 'Velox-Setup-Script',
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

// ─── 1. LABELS ────────────────────────────────────────────────────────
const labels = [
  {
    name: 'backend',
    color: '0E8A16',
    description: 'Backend API, Services, & Server Infrastructure',
  },
  { name: 'frontend', color: '1D76DB', description: 'Next.js 15 App Router Frontend & UI' },
  { name: 'edge', color: 'F9D0C4', description: 'Windows Edge Agent (.NET 8 Service)' },
  { name: 'database', color: '5319E7', description: 'PostgreSQL Database & Prisma Schema' },
  { name: 'api', color: '0052CC', description: 'REST API endpoints & contracts' },
  { name: 'authentication', color: 'BF360C', description: 'JWT, Argon2id, & Role-based Security' },
  { name: 'payments', color: '006B75', description: 'Razorpay & Counter Payment integrations' },
  {
    name: 'queue-engine',
    color: 'D93F0B',
    description: 'Core Queue calculation, ETA, & Scheduling',
  },
  { name: 'windows-agent', color: 'FBCA04', description: 'Windows Desktop Agent & Print Spooler' },
  { name: 'bug', color: 'd73a4a', description: "Something isn't working correctly" },
  { name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
  {
    name: 'documentation',
    color: '0075ca',
    description: 'Improvements or additions to documentation',
  },
  { name: 'design', color: 'd4c5f9', description: 'UI/UX, Framer Motion, and Design System' },
  { name: 'testing', color: 'c2e0c6', description: 'Unit, Integration, or E2E tests' },
  { name: 'security', color: 'ee0701', description: 'Security, privacy, and encryption tasks' },
  {
    name: 'performance',
    color: 'cc317c',
    description: 'Performance tuning and query optimization',
  },
  { name: 'refactor', color: 'e6e6e6', description: 'Code refactoring without behavioral change' },
  { name: 'question', color: 'd876e3', description: 'Further information is requested' },
  {
    name: 'high-priority',
    color: 'b60205',
    description: 'Critical path task required for current sprint',
  },
  { name: 'medium-priority', color: 'd93f0b', description: 'Normal priority task' },
  { name: 'low-priority', color: '0e8a16', description: 'Low priority task / nice to have' },
  {
    name: 'blocked',
    color: '000000',
    description: 'Blocked by external dependency or another issue',
  },
  { name: 'good-first-issue', color: '7057ff', description: 'Good for newcomers' },
  { name: 'help-wanted', color: '008672', description: 'Extra attention is needed' },
];

// ─── 2. MILESTONES ───────────────────────────────────────────────────
const milestoneTitles = [
  {
    title: 'Sprint 1 - Foundation',
    description:
      'Shared Package, Prisma DB Setup, Base API Architecture & Windows Agent Scaffolding',
  },
  {
    title: 'Sprint 2 - Authentication',
    description: 'JWT Auth, Password Hashing, Role Middleware, Frontend Auth & Agent Auth Protocol',
  },
  {
    title: 'Sprint 3 - Order Management',
    description: 'Order Creation API, File Upload Service, Customer Upload UI & Shop Order List',
  },
  {
    title: 'Sprint 4 - Queue Engine',
    description: 'Queue Engine Service, Dynamic ETA, Concurrency Locking, & Local Queue Manager',
  },
  {
    title: 'Sprint 5 - Windows Edge',
    description:
      'Printer Discovery, Download Manager, Windows Print Spooler Engine, & Temp Cleanup',
  },
  {
    title: 'Sprint 6 - Real-Time System',
    description:
      'Socket.IO Gateway, Live Queue Broadcasting, Agent Heartbeat & Frontend Status Sync',
  },
  {
    title: 'Sprint 7 - Integration',
    description:
      'Razorpay Payments, Counter Payment Flow, Dashboard Analytics & End-to-End Testing',
  },
  {
    title: 'Sprint 8 - MVP',
    description: 'Security Hardening, Auto File Purge Verification, Load Testing & Bug Fixes',
  },
  { title: 'Pilot Testing', description: 'Deployment to campus print shop for live testing' },
  { title: 'Version 1.0', description: 'Production Launch' },
];

// ─── 3. ISSUES DATA ──────────────────────────────────────────────────
const issues = [
  {
    title: 'Implement @velox/shared Package Enums, Types, and Constants',
    milestoneName: 'Sprint 1 - Foundation',
    labels: ['backend', 'frontend', 'api', 'high-priority'],
    body: `### Description
Create the single source of truth shared package containing TypeScript interfaces, constants, and enums used by both backend and frontend applications per \`PROJECT_RULES.md\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 3 Story Points
- **Dependencies:** None
- **Suggested Assignee:** Dev 1 (Backend & Architecture Lead)

### Acceptance Criteria
- [ ] Export \`UserRole\`, \`OrderStatus\`, \`PaymentStatus\`, \`PaymentMethod\`, \`PrinterType\`, \`PrinterStatus\`, \`AgentStatus\`, \`AllowedMimeType\` enums.
- [ ] Export TypeScript entities (\`Shop\`, \`User\`, \`Printer\`, \`Order\`, \`OrderFile\`, \`Payment\`, \`Transaction\`, \`Notification\`).
- [ ] Export constants for API routes, rate limits, file upload constraints (50MB, \`.pdf\`, \`.png\`, \`.jpg\`), queue buffers (30s), and Socket.IO events.
- [ ] Verify \`npm run build\` generates clean CJS/ESM declarations.`,
  },
  {
    title: 'Implement Shared Zod Validation Schemas',
    milestoneName: 'Sprint 1 - Foundation',
    labels: ['backend', 'frontend', 'security', 'high-priority'],
    body: `### Description
Implement Zod validation schemas in \`@velox/shared\` for request validation across client and server.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 2 Story Points
- **Dependencies:** Issue #1
- **Suggested Assignee:** Dev 1 (Backend Lead)

### Acceptance Criteria
- [ ] \`registerSchema\` (Name, Email, Password >= 8 chars).
- [ ] \`loginSchema\` (Email, Password).
- [ ] \`createOrderSchema\` (Shop UUID, copies 1–100, color, doubleSided, paymentMethod).
- [ ] \`fileUploadSchema\` (filename, allowed MIME types, max 50MB size).
- [ ] \`paginationSchema\` & \`uuidParamSchema\`.`,
  },
  {
    title: 'Implement PostgreSQL Schema with Prisma ORM',
    milestoneName: 'Sprint 1 - Foundation',
    labels: ['backend', 'database', 'high-priority'],
    body: `### Description
Define the relational database schema in \`backend/prisma/schema.prisma\` matching \`DATABASE.md\` specifications.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #1
- **Suggested Assignee:** Dev 1 (Backend Lead)

### Acceptance Criteria
- [ ] Define tables: \`shops\`, \`users\`, \`printers\`, \`orders\`, \`order_files\`, \`payments\`, \`transactions\`, \`notifications\`, \`order_events\`.
- [ ] Configure UUID primary keys, default \`now()\` created_at, and updated_at timestamps on all tables.
- [ ] Set up foreign key constraints and cascade rules per \`DATABASE.md\`.
- [ ] Add indexes on \`orders.shop_id\`, \`orders.order_status\`, \`payments.transaction_id\`, \`users.email\`, \`printers.shop_id\`.
- [ ] Create and verify initial Prisma migration script.`,
  },
  {
    title: 'Backend Error Handling & Logging Middleware Setup',
    milestoneName: 'Sprint 1 - Foundation',
    labels: ['backend', 'security', 'medium-priority'],
    body: `### Description
Implement centralized operational error handling (\`AppError\`) and Pino structured logging middleware per \`BACKEND_GUIDELINES.md\`.

### Metadata
- **Priority:** Medium Priority
- **Estimated Complexity:** 3 Story Points
- **Dependencies:** None
- **Suggested Assignee:** Dev 2 (Queue/Sockets Specialist)

### Acceptance Criteria
- [ ] Base \`AppError\` class with \`statusCode\` and operational flag.
- [ ] Derived errors: \`ValidationError\`, \`AuthenticationError\`, \`NotFoundError\`, \`QueueError\`, \`PaymentError\`.
- [ ] Global error handler returning standard response: \`{ success: false, message, error: {} }\`.
- [ ] Configure Pino logger with pretty printing in development and JSON in production.
- [ ] Sanitize log output (never log passwords, tokens, or document contents).`,
  },
  {
    title: 'Next.js Design System Shell & Theme Setup',
    milestoneName: 'Sprint 1 - Foundation',
    labels: ['frontend', 'design', 'high-priority'],
    body: `### Description
Implement the monochrome design system tokens, Geist/Inter fonts, Tailwind config, and layout shell matching \`DESIGN.md\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 3 Story Points
- **Dependencies:** None
- **Suggested Assignee:** Dev 3 (Frontend Specialist)

### Acceptance Criteria
- [ ] Configure Tailwind CSS color tokens (Black #111111, White #FFFFFF, Neutral Grays 50–900).
- [ ] Import Lucide Icons default configuration (20–24px, 2px stroke).
- [ ] Set up root Next.js \`layout.tsx\` with Font providers and Toast notification provider.
- [ ] Create reusable button variants (Primary, Secondary, Destructive) and Card components.`,
  },
  {
    title: '.NET 8 Windows Agent Solution Scaffolding',
    milestoneName: 'Sprint 1 - Foundation',
    labels: ['edge', 'windows-agent', 'high-priority'],
    body: `### Description
Set up the .NET 8 console application architecture matching the folder structure in \`WINDOWS_AGENT.md\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 3 Story Points
- **Dependencies:** None
- **Suggested Assignee:** Dev 4 (Windows Edge Specialist)

### Acceptance Criteria
- [ ] Create namespaces: Authentication, Connection, Queue, Download, Printer, Printing, Heartbeat, Configuration, Logging, Utilities.
- [ ] Configure \`appsettings.json\` reader for Backend URL, Shop ID, Device ID, and Heartbeat interval (30s).
- [ ] Set up Serilog for local file logging under \`%AppData%/Velox/Logs\`.
- [ ] Verify clean build targeting .NET 8 runtime.`,
  },
  {
    title: 'JWT Authentication & Password Hashing Service',
    milestoneName: 'Sprint 2 - Authentication',
    labels: ['backend', 'authentication', 'security', 'high-priority'],
    body: `### Description
Implement backend authentication endpoints (\`/auth/register\`, \`/auth/login\`, \`/auth/refresh\`) with Argon2id password hashing and short-lived JWT tokens per \`SECURITY.md\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #3
- **Suggested Assignee:** Dev 1 (Backend Lead)

### Acceptance Criteria
- [ ] Hash passwords using Argon2id before saving to \`users\` table.
- [ ] Generate 15-minute JWT Access Tokens containing \`userId\`, \`shopId\`, and \`role\`.
- [ ] Implement \`POST /api/v1/auth/register\` and \`POST /api/v1/auth/login\`.
- [ ] Return standardized response \`{ success: true, message, data: { token, user } }\`.
- [ ] Write unit tests for Auth service and token verification.`,
  },
  {
    title: 'Authentication & Role Authorization Middleware',
    milestoneName: 'Sprint 2 - Authentication',
    labels: ['backend', 'authentication', 'security', 'high-priority'],
    body: `### Description
Create Express middlewares to enforce Bearer token authentication and role permissions (\`Customer\`, \`Operator\`, \`Owner\`, \`Admin\`).

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 3 Story Points
- **Dependencies:** Issue #7
- **Suggested Assignee:** Dev 1 (Backend Lead)

### Acceptance Criteria
- [ ] \`authenticateJWT\` middleware to extract and verify Bearer token from Authorization header.
- [ ] \`authorizeRoles(...roles)\` middleware to enforce required user role.
- [ ] Return 401 Unauthorized for missing/invalid tokens and 403 Forbidden for role mismatch.`,
  },
  {
    title: 'Frontend Auth Store & Login Screen',
    milestoneName: 'Sprint 2 - Authentication',
    labels: ['frontend', 'authentication', 'high-priority'],
    body: `### Description
Implement Zustand authentication store, login form with React Hook Form + Zod, and JWT persistence.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #5, Issue #7
- **Suggested Assignee:** Dev 3 (Frontend Specialist)

### Acceptance Criteria
- [ ] \`useAuthStore\` managing \`user\`, \`token\`, \`isAuthenticated\`, \`login()\`, \`logout()\`.
- [ ] Create \`/login\` page with input validation and inline error display.
- [ ] Store token in local storage or secure cookie.
- [ ] Redirect user to \`/admin\` (operator/owner) or \`/\` (customer) upon login.`,
  },
  {
    title: 'Windows Agent Authentication & Device Binding Protocol',
    milestoneName: 'Sprint 2 - Authentication',
    labels: ['edge', 'windows-agent', 'authentication', 'high-priority'],
    body: `### Description
Implement device login and token storage in the Windows Agent service.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #6, Issue #7
- **Suggested Assignee:** Dev 4 (Windows Edge Specialist)

### Acceptance Criteria
- [ ] Send \`POST /api/v1/agent/login\` with \`shopId\` and \`deviceId\`.
- [ ] Store received auth token securely in local config (\`%AppData%/Velox/config.json\`).
- [ ] Implement token auto-refresh mechanism when token expires.
- [ ] Handle offline authentication grace period with retry loop.`,
  },
  {
    title: 'Shop Details & Statistics API',
    milestoneName: 'Sprint 3 - Order Management',
    labels: ['backend', 'api', 'medium-priority'],
    body: `### Description
Implement REST endpoints to retrieve shop details, printer configuration, and daily statistics per \`API_SPEC.md\`.

### Metadata
- **Priority:** Medium Priority
- **Estimated Complexity:** 3 Story Points
- **Dependencies:** Issue #3, Issue #8
- **Suggested Assignee:** Dev 1 (Backend Lead)

### Acceptance Criteria
- [ ] \`GET /api/v1/shops/{shopId}\` returning shop name, QR code, printers, and estimated wait time.
- [ ] \`GET /api/v1/shops/{shopId}/stats\` returning today's orders count, revenue, active queue length, completed count.
- [ ] Validate \`shopId\` UUID parameter.`,
  },
  {
    title: 'Order Creation API & Price Calculator',
    milestoneName: 'Sprint 3 - Order Management',
    labels: ['backend', 'api', 'high-priority'],
    body: `### Description
Implement \`POST /api/v1/orders\` endpoint to record new print orders in Pending state and calculate total cost.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #3, Issue #8
- **Suggested Assignee:** Dev 1 (Backend Lead)

### Acceptance Criteria
- [ ] Validate body using \`createOrderSchema\`.
- [ ] Generate unique short human-readable \`orderCode\` (e.g., \`A102\`).
- [ ] Calculate \`totalPrice\` based on copies, pages, color option, and double-sided selection.
- [ ] Create record in \`orders\` table with status Pending.
- [ ] Log Order Created event in \`order_events\`.`,
  },
  {
    title: 'Secure File Upload Service & Storage Controller',
    milestoneName: 'Sprint 3 - Order Management',
    labels: ['backend', 'security', 'api', 'high-priority'],
    body: `### Description
Implement \`POST /api/v1/orders/{id}/upload\` multipart endpoint for uploading PDF/Image documents to temporary server storage.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #12
- **Suggested Assignee:** Dev 2 (Queue/Sockets Specialist)

### Acceptance Criteria
- [ ] Validate MIME type (\`application/pdf\`, \`image/png\`, \`image/jpeg\`) and size (<= 50MB).
- [ ] Reject all executable, script, or archive files with 422 Validation Error.
- [ ] Extract PDF page count automatically using a backend PDF parser.
- [ ] Save record in \`order_files\` with \`delete_after\` timestamp.
- [ ] Update \`orders.total_pages\` and recalculate final order price.`,
  },
  {
    title: 'Customer QR Landing Page & Print Config Flow',
    milestoneName: 'Sprint 3 - Order Management',
    labels: ['frontend', 'design', 'high-priority'],
    body: `### Description
Build the mobile-first customer flow for scanning shop QR, selecting documents, and setting print options per \`DESIGN.md\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #5, Issue #12
- **Suggested Assignee:** Dev 3 (Frontend Specialist)

### Acceptance Criteria
- [ ] Route \`/shop/[shopId]\` displaying shop title and active queue wait time.
- [ ] Drag-and-drop / Browse document upload with progress bar.
- [ ] Print settings form: Copies stepper, Color vs. B&W toggle, Single vs. Double-sided toggle.
- [ ] Live price preview calculator updating instantly on setting change.
- [ ] Framer Motion smooth step transitions (150–250ms).`,
  },
  {
    title: 'Shop Dashboard Live Order List Component',
    milestoneName: 'Sprint 3 - Order Management',
    labels: ['frontend', 'design', 'medium-priority'],
    body: `### Description
Build the desktop-first operator dashboard order management table.

### Metadata
- **Priority:** Medium Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #5, Issue #11
- **Suggested Assignee:** Dev 3 (Frontend Specialist)

### Acceptance Criteria
- [ ] Route \`/admin/orders\` displaying active and pending order rows.
- [ ] Displays Order Code, Customer Name, Pages, Copies, Type (B&W/Color), Status badge, Action buttons.
- [ ] Filter tabs: All, Waiting, Printing, Completed, Cancelled.
- [ ] Skeleton loaders for loading state.`,
  },
  {
    title: 'Core Queue Engine Service & Dynamic Position Calculation',
    milestoneName: 'Sprint 4 - Queue Engine',
    labels: ['backend', 'queue-engine', 'high-priority'],
    body: `### Description
Implement the single source of truth Queue Engine service per \`QUEUE_ENGINE.md\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 8 Story Points
- **Dependencies:** Issue #12, Issue #13
- **Suggested Assignee:** Dev 2 (Queue Specialist)

### Acceptance Criteria
- [ ] Order transitions to Waiting state upon successful payment.
- [ ] Implement dynamic queue position formula: \`COUNT(orders ahead with status IN (Waiting, Assigned, Downloading, Printing) AND created_at < currentOrder.created_at)\`.
- [ ] Position is NEVER stored as a static column; always calculated dynamically.
- [ ] Implement atomic database transactions for state transitions to prevent race conditions.`,
  },
  {
    title: 'Dynamic ETA & Printer Allocation Algorithm',
    milestoneName: 'Sprint 4 - Queue Engine',
    labels: ['backend', 'queue-engine', 'high-priority'],
    body: `### Description
Implement the printer matching rules and dynamic ETA calculation formula.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 8 Story Points
- **Dependencies:** Issue #16
- **Suggested Assignee:** Dev 2 (Queue Specialist)

### Acceptance Criteria
- [ ] Match job specs to printers: Color jobs -> Color Printer; B&W jobs -> B&W Printer; Pages > threshold -> Bulk Printer.
- [ ] Implement ETA formula: \`(Total Pages Ahead / Printer PPM) + 30s Buffer\`.
- [ ] Return \`queuePosition\`, \`peopleAhead\`, and \`estimatedTime\` via \`GET /api/v1/orders/{id}/queue\`.`,
  },
  {
    title: 'Order Cancellation & Retry Controller Logic',
    milestoneName: 'Sprint 4 - Queue Engine',
    labels: ['backend', 'queue-engine', 'medium-priority'],
    body: `### Description
Implement cancellation validation rules and automated retry logic for failed jobs.

### Metadata
- **Priority:** Medium Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #16
- **Suggested Assignee:** Dev 2 (Queue Specialist)

### Acceptance Criteria
- [ ] \`PATCH /api/v1/orders/{id}/cancel\`: Allow cancellation ONLY if status is Pending or Waiting.
- [ ] Reject cancellation with 400 Bad Request if printing has already started (prevents paper wastage).
- [ ] Support up to 3 automatic retries for failed print jobs before marking Failed.`,
  },
  {
    title: 'Windows Agent Queue Manager & Persistence',
    milestoneName: 'Sprint 4 - Queue Engine',
    labels: ['edge', 'windows-agent', 'queue-engine', 'high-priority'],
    body: `### Description
Implement the local queue manager inside the Windows Agent to receive, order, and track local print jobs.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #10, Issue #16
- **Suggested Assignee:** Dev 4 (Windows Edge Specialist)

### Acceptance Criteria
- [ ] Receive assigned job payloads from cloud backend.
- [ ] Maintain in-memory local queue sorted by assignment order.
- [ ] Persist pending local queue to local SQLite / JSON storage for crash recovery.
- [ ] Ignore duplicate job assignments using unique \`orderId\` validation.`,
  },
  {
    title: 'Windows Agent Printer Discovery Engine',
    milestoneName: 'Sprint 5 - Windows Edge',
    labels: ['edge', 'windows-agent', 'high-priority'],
    body: `### Description
Implement local printer detection using Windows Management Instrumentation (WMI) / \`System.Drawing.Printing\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #6
- **Suggested Assignee:** Dev 4 (Windows Edge Specialist)

### Acceptance Criteria
- [ ] On startup, enumerate all locally connected and network printers.
- [ ] Collect Printer Name, Status (Online/Offline/Paper Empty), Color Capability, and Default Paper Sizes.
- [ ] Sync discovered printer capability list with cloud backend via \`POST /api/v1/agent/printers\`.`,
  },
  {
    title: 'Secure File Download Manager with Checksum Verification',
    milestoneName: 'Sprint 5 - Windows Edge',
    labels: ['edge', 'windows-agent', 'security', 'high-priority'],
    body: `### Description
Build the Agent Download Manager to retrieve PDF/Image files from cloud backend to temporary local storage.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #13, Issue #19
- **Suggested Assignee:** Dev 4 (Windows Edge Specialist)

### Acceptance Criteria
- [ ] Download document to \`%AppData%/Velox/Temp/\`.
- [ ] Validate file SHA-256 checksum after download completes.
- [ ] Support automatic download retries for interrupted connections.
- [ ] Transition job state to Downloading during fetch and notify backend.`,
  },
  {
    title: 'Windows Silent Print Engine Integration',
    milestoneName: 'Sprint 5 - Windows Edge',
    labels: ['edge', 'windows-agent', 'high-priority'],
    body: `### Description
Implement automated silent printing using Windows Print Spooler APIs without displaying print dialogs per \`WINDOWS_AGENT.md\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 8 Story Points
- **Dependencies:** Issue #20, Issue #21
- **Suggested Assignee:** Dev 4 (Windows Edge Specialist)

### Acceptance Criteria
- [ ] Send document directly to target printer spooler using specific job settings (Copies, Duplex mode, Color mode).
- [ ] Monitor print job progress until spooling finishes.
- [ ] Execute fully automatically without requiring operator intervention.
- [ ] Update backend job status to Printing upon start and Completed upon finish.`,
  },
  {
    title: 'Agent Automatic Local Cleanup Service',
    milestoneName: 'Sprint 5 - Windows Edge',
    labels: ['edge', 'windows-agent', 'security', 'medium-priority'],
    body: `### Description
Implement background cleanup worker to delete printed files and purge temporary cache per privacy requirements.

### Metadata
- **Priority:** Medium Priority
- **Estimated Complexity:** 3 Story Points
- **Dependencies:** Issue #22
- **Suggested Assignee:** Dev 4 (Windows Edge Specialist)

### Acceptance Criteria
- [ ] Delete temporary file from \`%AppData%/Velox/Temp/\` immediately after print job completion.
- [ ] Periodically clean failed or aborted temporary files older than 1 hour.
- [ ] Verify zero residual customer files remain on local disk after job completion.`,
  },
  {
    title: 'Socket.IO Gateway & Multi-Namespace Server Setup',
    milestoneName: 'Sprint 6 - Real-Time System',
    labels: ['backend', 'api', 'high-priority'],
    body: `### Description
Initialize Socket.IO server attached to Express with 3 distinct namespaces per \`BACKEND_GUIDELINES.md\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #8, Issue #16
- **Suggested Assignee:** Dev 2 (Sockets Specialist)

### Acceptance Criteria
- [ ] Create \`/customer\`, \`/admin\`, and \`/agent\` Socket.IO namespaces.
- [ ] Enforce JWT authentication on socket connections.
- [ ] Manage active socket room subscriptions (e.g., customer joining \`order:{orderId}\` room; admin joining \`shop:{shopId}\` room).`,
  },
  {
    title: 'Real-Time Queue & Order Status Event Broadcaster',
    milestoneName: 'Sprint 6 - Real-Time System',
    labels: ['backend', 'queue-engine', 'high-priority'],
    body: `### Description
Broadcast real-time order lifecycle events across customer, admin, and agent sockets.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #24
- **Suggested Assignee:** Dev 2 (Sockets Specialist)

### Acceptance Criteria
- [ ] Emit \`order.created\`, \`queue.updated\`, \`printing.started\`, \`printing.completed\`, \`order.ready\` to \`/customer\` namespace.
- [ ] Emit \`new.order\`, \`queue.changed\`, \`printer.offline\` to \`/admin\` namespace.
- [ ] Broadcast latency must be < 500ms.`,
  },
  {
    title: 'Agent Heartbeat Service & Offline Handler',
    milestoneName: 'Sprint 6 - Real-Time System',
    labels: ['edge', 'windows-agent', 'high-priority'],
    body: `### Description
Implement the 30-second heartbeat loop between Windows Agent and Backend per \`WINDOWS_AGENT.md\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #10, Issue #24
- **Suggested Assignee:** Dev 4 (Windows Edge Specialist)

### Acceptance Criteria
- [ ] Agent sends heartbeat payload every 30s: \`{ status, version, printerStatus, queueLength, lastActivity }\`.
- [ ] Backend updates printer health status.
- [ ] If agent misses 3 consecutive heartbeats (90s), mark shop agent as Offline and pause online queue assignment.
- [ ] Agent automatically reconnects and resumes queue when network returns.`,
  },
  {
    title: 'Customer Live Queue & Status Tracker UI Component',
    milestoneName: 'Sprint 6 - Real-Time System',
    labels: ['frontend', 'design', 'high-priority'],
    body: `### Description
Build real-time customer status screen with live queue position counter, estimated wait time timer, and status progress bar.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #14, Issue #25
- **Suggested Assignee:** Dev 3 (Frontend Specialist)

### Acceptance Criteria
- [ ] Connect to \`/customer\` socket namespace and join \`order:{orderId}\` room.
- [ ] Dynamically update Queue Position and Estimated Time without full page refresh.
- [ ] Animated status progress steps using Framer Motion (Waiting -> Printing -> Ready for Pickup).
- [ ] Trigger audio notification / toast alert when order status becomes Completed.`,
  },
  {
    title: 'Razorpay Online Payment Gateway Integration',
    milestoneName: 'Sprint 7 - Integration',
    labels: ['backend', 'payments', 'high-priority'],
    body: `### Description
Integrate Razorpay payment gateway for UPI, Card, and Netbanking customer payments per \`API_SPEC.md\`.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 8 Story Points
- **Dependencies:** Issue #12
- **Suggested Assignee:** Dev 1 (Backend Lead)

### Acceptance Criteria
- [ ] \`POST /api/v1/payments/create\`: Create Razorpay payment order session.
- [ ] \`POST /api/v1/payments/verify\`: Verify Razorpay signature (\`razorpay_order_id\`, \`razorpay_payment_id\`, \`razorpay_signature\`).
- [ ] On successful verification, record entry in \`payments\` and \`transactions\` tables.
- [ ] Trigger Queue Engine to transition order status from Pending to Waiting.`,
  },
  {
    title: 'Shop Operator Counter Payment Flow UI',
    milestoneName: 'Sprint 7 - Integration',
    labels: ['frontend', 'payments', 'medium-priority'],
    body: `### Description
Implement counter payment modal on the shop dashboard to allow operators to manually confirm cash/UPI payments.

### Metadata
- **Priority:** Medium Priority
- **Estimated Complexity:** 3 Story Points
- **Dependencies:** Issue #15, Issue #28
- **Suggested Assignee:** Dev 3 (Frontend Specialist)

### Acceptance Criteria
- [ ] Modal trigger on order row: "Mark Counter Paid".
- [ ] Call \`POST /api/v1/payments/counter\` (Operator role required).
- [ ] Update order status in real time across dashboard and customer view.`,
  },
  {
    title: 'Shop Printer Management Dashboard Component',
    milestoneName: 'Sprint 7 - Integration',
    labels: ['frontend', 'design', 'medium-priority'],
    body: `### Description
Build printer monitoring panel on admin dashboard showing connected printers, status badges, PPM, and type routing.

### Metadata
- **Priority:** Medium Priority
- **Estimated Complexity:** 5 Story Points
- **Dependencies:** Issue #15, Issue #20
- **Suggested Assignee:** Dev 3 (Frontend Specialist)

### Acceptance Criteria
- [ ] Route \`/admin/printers\` listing all discovered shop printers.
- [ ] Displays live status (Online, Offline, Printing, Paused).
- [ ] Toggle switch to manually pause or resume a printer.`,
  },
  {
    title: 'Server-Side Automatic Document Cleanup Cron Job',
    milestoneName: 'Sprint 8 - MVP',
    labels: ['backend', 'security', 'high-priority'],
    body: `### Description
Implement scheduled worker job to automatically delete temporary files from backend storage after print completion per privacy guidelines.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 3 Story Points
- **Dependencies:** Issue #13, Issue #22
- **Suggested Assignee:** Dev 1 (Backend Lead)

### Acceptance Criteria
- [ ] Periodically query \`order_files\` where \`delete_after <= NOW()\` or order status is Completed/Collected.
- [ ] Permanently delete files from server disk / S3 bucket.
- [ ] Log file deletion audit event in \`order_events\`.
- [ ] Verify zero residual files remain.`,
  },
  {
    title: 'End-to-End MVP Integration & Security Audit',
    milestoneName: 'Sprint 8 - MVP',
    labels: ['testing', 'security', 'performance', 'high-priority'],
    body: `### Description
Perform full end-to-end testing across customer QR scan, upload, payment, queue engine allocation, Windows Agent silent print, and automatic file cleanup.

### Metadata
- **Priority:** High Priority
- **Estimated Complexity:** 8 Story Points
- **Dependencies:** All previous issues
- **Suggested Assignee:** Dev 1 & Dev 2 & Dev 3 & Dev 4

### Acceptance Criteria
- [ ] Complete customer order printed in < 1 minute without manual operator intervention.
- [ ] Verify zero console errors, zero uncaught exceptions.
- [ ] Security audit: Validate CORS, rate limits, non-persistent file storage, and password hashes.
- [ ] Verify 99.9% queue assignment success rate.`,
  },
];

// ─── MAIN EXECUTION ──────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting GitHub Population for repo:', REPO);

  // 1. Create Labels
  console.log('\n--- 🏷️ CREATING LABELS ---');
  for (const label of labels) {
    try {
      await apiRequest('/labels', 'POST', label);
      console.log(`  ✓ Label created: ${label.name}`);
    } catch (e) {
      if (e.message.includes('already_exists')) {
        console.log(`  ℹ️ Label already exists: ${label.name}`);
      } else {
        console.error(`  ❌ Failed label ${label.name}:`, e.message);
      }
    }
  }

  // 2. Create Milestones
  console.log('\n--- 🎯 CREATING MILESTONES ---');
  const milestoneMap = new Map();
  for (const ms of milestoneTitles) {
    try {
      const res = await apiRequest('/milestones', 'POST', ms);
      milestoneMap.set(ms.title, res.number);
      console.log(`  ✓ Milestone created: ${ms.title} (#${res.number})`);
    } catch (e) {
      if (e.message.includes('already_exists')) {
        // Fetch existing milestones
        const existing = await apiRequest('/milestones', 'GET');
        const match = existing.find((m) => m.title === ms.title);
        if (match) {
          milestoneMap.set(ms.title, match.number);
          console.log(`  ℹ️ Milestone already exists: ${ms.title} (#${match.number})`);
        }
      } else {
        console.error(`  ❌ Failed milestone ${ms.title}:`, e.message);
      }
    }
  }

  // Fetch all milestones to be safe
  try {
    const allMs = await apiRequest('/milestones', 'GET');
    allMs.forEach((m) => milestoneMap.set(m.title, m.number));
  } catch (e) {}

  // 3. Create Issues
  console.log('\n--- 📋 CREATING 32 ISSUES ---');
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const milestoneNumber = milestoneMap.get(issue.milestoneName);

    const payload = {
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
      milestone: milestoneNumber || undefined,
    };

    try {
      const res = await apiRequest('/issues', 'POST', payload);
      console.log(`  ✓ Issue #${i + 1} created: "${res.title}" (#${res.number})`);
    } catch (e) {
      console.error(`  ❌ Failed to create issue #${i + 1} "${issue.title}":`, e.message);
    }
    // Small delay to prevent API rate limiting
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log('\n✅ GitHub Population Complete!');
}

main().catch(console.error);
