# Velox Demo Environment Guide

## 1. Overview

The Velox Demo Environment provides a complete, runnable instance of the Velox Print Platform operating against real PostgreSQL with native Windows Spooler integration.

## 2. Components

| Component         | Technology                       | Default Endpoint            | Responsibility                                              |
| ----------------- | -------------------------------- | --------------------------- | ----------------------------------------------------------- |
| **PostgreSQL**    | Native PostgreSQL 18.4 (x64)     | localhost:5432              | Relational storage, ACID transactions, Prisma migrations    |
| **Backend**       | Express + Socket.IO + Prisma     | http://localhost:5000       | REST API, WebSocket gateway, queue engine, pricing          |
| **Frontend**      | Next.js 16 + React 19 + Tailwind | http://localhost:3000       | Partner portal, Shop Owner counter station, Customer QR app |
| **Windows Agent** | .NET 9 C# Desktop Service        | Process / Background Worker | Edge device, printer discovery, streaming download, Spooler |

---

## 3. Demo Accounts

> [!NOTE]
> All accounts below use local development credentials. Never commit production passwords.

### A. Velox Central Partner

- **Email:** partner@velox.dev
- **Role:** PARTNER
- **Default Dev Password:** PartnerSecure2026!
- **Access Portal:** `/partner/login`
- **Capabilities:** View company network metrics, provision new shops and owner accounts.

### B. Velox Demo Shop Owner

- **Email:** demo.owner@velox.dev
- **Role:** SHOP_OWNER
- **Initial Temporary Password:** TempPassword2026!
- **State:** `firstLogin: true` (mandatory password update upon first login)
- **Access Portal:** `/shop-owner/login`
- **Capabilities:** Manage single assigned shop (Velox Demo Shop), view live queue, configure rates, view real-time Agent status.

---

## 4. Canonical Demo Shop

- **Name:** Velox Demo Shop
- **City:** Chhatrapati Sambhajinagar
- **Address:** Plot 12, Station Road, Chhatrapati Sambhajinagar, MH 431005
- **Public Shop ID:** shop_demo_velox
- **Status:** ACTIVE
- **Configured Rates:**
  - Black & White: **₹3.00** / page
  - Color: **₹12.00** / page
  - Duplex Discount: **-₹0.75** / page
- **Customer QR URL:** `/shop/shop_demo_velox`

---

## 5. Registered Edge Agent

- **Device ID:** VELOX-DEMO-AGENT-01
- **Device Name:** Velox Demo Counter Agent
- **Bound Shop:** Velox Demo Shop
- **Platform:** Windows
- **Secret Key:** `agent_secret_key_demo_2026`
- **Heartbeat Interval:** 30 seconds

---

## 6. Startup Order

Start services in this exact order:

### Step 1: Start PostgreSQL

```bash
npm run db:start
```

Starts the native PostgreSQL daemon on `localhost:5432` with database `velox_dev`.

### Step 2: Run Migrations & Seed (First-time or Reset)

```bash
npm run db:migrate
npm run db:seed
```

### Step 3: Start Backend API & WebSocket Gateway

```bash
npm run dev:backend
```

Listens on `http://localhost:5000`. Health check: `http://localhost:5000/api/v1/health`.

### Step 4: Start Frontend Portal

```bash
npm run dev:frontend
```

Accessible at `http://localhost:3000`.

### Step 5: Start Windows Edge Agent

```bash
npm run dev:agent
```

Connects to `http://localhost:5000/agent`, authenticates device `VELOX-DEMO-AGENT-01`, and begins heartbeat loop.

---

## 7. Automated Demo Reset

To reset transactional orders, clean temporary files, and reseed the clean demo environment at any time:

```bash
npm run demo:reset
```

_Guarded against accidental execution in NODE_ENV=production._

---

## 8. Verification Workflow

1. **Health Check:** `curl http://localhost:5000/api/v1/health` -> verify database: connected, agentGateway: running.
2. **Partner Login:** Sign in at `/partner/login` with `partner@velox.dev`. Verify Velox Demo Shop is listed.
3. **Shop Owner Login:** Sign in at `/shop-owner/login` with `demo.owner@velox.dev`. Complete password reset.
4. **Agent Visibility:** Check dashboard at `/shop-owner`. Verify `VELOX-DEMO-AGENT-01` displays `● Online` with recent heartbeat.
5. **Customer Scan:** Navigate to `/shop/shop_demo_velox`. Guest session created automatically without login.
6. **Upload & Print:** Upload test PDF (`test-assets/e2e-test-order.pdf`), verify shop pricing (₹3.00), submit order.
7. **Payment & Spool:** Simulate payment -> order enters `WAITING` -> dispatched to Agent -> Agent downloads, verifies SHA-256, and spools via Windows Print Spooler -> order transitions to `COMPLETED`.
