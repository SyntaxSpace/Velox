# Velox — Multi-Shop Smart Printing Platform

> **Scan. Upload. Done.**  
> Frictionless, zero-login campus & counter printing platform with real-time queueing and native Windows Spooler integration.

---

## 🌟 Overview

Velox transforms traditional, manual photocopy and printing workflows (such as sending files via WhatsApp or USB drives) into a privacy-first, automated digital pipeline.

### The Problem

- Customers wait in congested lines, handing over personal WhatsApp messages or USB drives.
- Shop operators manually ask for print configurations (copies, color, duplex, paper size) and risk file mix-ups.
- Customers have no visibility into queue wait times or printer availability.
- Privacy risks from unmanaged documents lingering on counter PCs and chat apps.

### The Velox Solution

- **Zero-Login for Customers**: Customers point their phone camera at a counter QR stand card, pick their document (PDF), configure print settings, pay, and monitor their live queue position without ever creating an account or downloading an app.
- **Dedicated Owner Onboarding**: Shop owners register, set up multiple store profiles, generate printable counter QR stands, and monitor their printer fleet.
- **Edge Windows Agent**: A high-performance, background C# / .NET 9 service running on counter PCs that auto-discovers Windows Spooler printers, securely downloads print files with SHA-256 integrity checks, spools jobs silently, and securely shreds temporary files with zero local residual data.

---

## 🏗️ Architecture

```text
Customer (Mobile Web)               Shop Counter (Windows PC)
  │                                    │
  ├─ Scan QR Stand Card                ├─ Local Physical / Virtual Printers
  ├─ Public Shop (/shop/:publicShopId) │     (Epson, HP, Canon, WinSpool)
  ├─ Anonymous 24h Guest Session       │
  ├─ Upload PDF & Configure Settings   ├─ Velox Windows Edge Agent (.NET 9)
  └─ Dev / Counter Payment             │    ├─ Device Authentication
            │                          │    ├─ Auto-Discovery Engine
            ▼                          │    ├─ SQLite Persistence
   Velox Backend (Express/TS)          │    ├─ Streaming Download & SHA-256
      ├─ Dynamic Queue Engine (ETA)    │    ├─ Silent Spooler Engine
      ├─ Strict Multi-Shop Isolation   │    └─ Zero-Residual Shredder
      ├─ Socket.IO Event Broadcaster   │              ▲
      └─ Prisma Data Layer             └──────────────┘
            │                                 │
            └────────── Polling / WS ─────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ & npm 10+
- .NET 9.0 SDK (for Windows Agent on Windows 10/11)
- Optional: PostgreSQL 15+ (in development, an automatic in-memory fallback is active if DB is offline)

### Installation

```bash
# Clone the repository
git clone https://github.com/SyntaxSpace/Velox.git
cd Velox

# Install dependencies across workspaces
npm install
```

### Running the Services

#### 1. Backend Service (Port 5000)

```bash
npm run dev --workspace=backend
```

#### 2. Frontend Application (Port 3000)

```bash
npm run dev --workspace=frontend
```

#### 3. Windows Edge Agent (.NET 9)

```bash
dotnet run --project windows-agent/VeloxAgent.csproj
```

---

## 🧪 Testing & Verification

### Automated Backend Test Suite

```bash
npm run test --workspace=backend
```

Includes 10 test suites (66 automated unit tests) validating:

- Windows Agent device authentication & binding
- JWT token generation, refresh tokens, and Argon2id password hashing
- Dynamic queue position & ETA calculation formulas
- Order lifecycle state machine & transition rules
- Shop owner registration blocking & partner-only provisioning enforcement
- Multi-shop creation, owner isolation (Owner A vs Owner B), and public shop lookup
- Anonymous guest customer sessions, order authorization, and cross-shop isolation
- Partner network overview, company metrics aggregation, and atomic shop+owner provisioning
- Shop owner single-shop scope, first-login password enforcement, and role isolation
- Dynamic shop-specific pricing configuration and order cost calculation

### Complete 10-Stage End-to-End Pipeline Verification

```bash
node scripts/verify-e2e-pipeline.mjs
```

Verifies the complete 10-stage print pipeline:

1. Customer PDF Upload
2. Payment Processing (`WAITING`)
3. Queue Engine & ETA Calculation
4. Job Assignment & Real-Time Dispatch (`ASSIGNED`)
5. Agent Streaming Download
6. SHA-256 Checksum Verification
7. Windows Spooler Execution (WinSpool)
8. Agent Lifecycle Status Reporting (`COMPLETED`)
9. Zero-Residual Temp File Shredding
10. Idempotency & Duplicate Suppression

---

## 📂 Repository Structure

```text
Velox/
├── backend/            # Express.js, TypeScript, Prisma ORM, Socket.IO
│   ├── prisma/         # PostgreSQL schema with Partner, Shop & Pricing models
│   ├── src/            # Controllers, Services, Repositories, Middlewares
│   └── tests/          # 10 Vitest automated test suites (66 unit tests)
├── frontend/           # Next.js 16 (App Router), React 19, Tailwind CSS
│   └── src/
│       ├── app/(auth)/      # Login & Partner Provisioning Notice
│       ├── app/(admin)/     # Partner Dashboard, Shop Owner Counter, Pricing
│       └── app/(customer)/  # Public Shop, Guest Upload, Live Queue
├── shared/             # Shared TypeScript types, Zod schemas, constants
├── windows-agent/      # Native Windows Edge Agent (.NET 9 C#)
│   ├── Services/       # DownloadManager, SpoolEngine, DiscoveryEngine, CleanupService
│   └── Program.cs      # Background worker entrypoint
├── docs/               # Architecture, API Spec, Database, Security guidelines
└── scripts/            # E2E pipeline verification and audit scripts
```

---

## 🔒 Security & Privacy

- **Argon2id** password hashing with salt and strict cost parameters.
- **Signed JWT** authentication with strict role-based access control (`ADMIN`, `PARTNER`, `SHOP_OWNER`, `OPERATOR`, `CUSTOMER`).
- **Partner Central Control**: Only authorized Velox Partners can provision new stores and accounts.
- **Enforced Password Reset**: All provisioned shop owners must update their temporary password on first login (`firstLogin: true`).
- **Owner Isolation**: Shop Owner is strictly bounded to their assigned store.
- **Ephemeral Guest Sessions**: Customer orders are keyed by unique `guestSessionId`. Guests can only access their own orders.
- **Zero-Residual Document Storage**: Customer PDFs are automatically purged upon print completion.
