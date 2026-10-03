# Velox Architecture & Platform Hierarchy (Day 8 Production)

**Project:** Velox
**Version:** 1.0 (Day 8 Production Pivot)
**Status:** Production Ready

---

## 1. Central Platform Hierarchy & Business Model

Velox is **not a self-service marketplace** where shop owners register themselves. **Velox Company is the central platform owner.**

```text
                    VELOX COMPANY
                         │
                         ▼
                  VELOX PARTNER
                  Private Login
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   Shop A (Provisioned)              Shop B (Provisioned)
        │                                 │
   Shop Owner A                      Shop Owner B
   (Assigned Credentials)            (Assigned Credentials)
        │                                 │
   Windows Agent A                   Windows Agent B
        │                                 │
   Printer Fleet A                   Printer Fleet B
        │                                 │
        ▼                                 ▼
   Customers (Zero-Login QR)         Customers (Zero-Login QR)
```

### Core Entity Rules:

1. **Velox Partner / Admin (`PARTNER`, `ADMIN`)**:
   - Authorized platform operator.
   - Views company-wide metrics and all shops across the network.
   - Atomically provisions shops and creates shop owner accounts with temporary passwords.
2. **Shop Owner (`SHOP_OWNER`, `OWNER`)**:
   - Accounts are never self-registered (public registration rejects shop owner roles).
   - Receives credentials from Velox Partner.
   - Must update temporary password on first login (`firstLogin: true`).
   - Scoped strictly to their single assigned shop (queue, printers, QR stand, pricing).
3. **Shop Operator (`OPERATOR`)**:
   - Counter operator assisting with print processing and terminal status.
4. **Customer (Zero-Login Guest)**:
   - Scans counter QR stand directly with mobile device.
   - No login or registration needed; receives anonymous guest session token.
5. **Windows Agent (Edge)**:
   - Background Windows service authenticating via `DeviceId` and `DeviceKey`.
   - Long-lived Socket.IO connection; pulls assigned print jobs via streaming downloader.
   - Verifies SHA-256 integrity, dispatches silently via WinSpool API, and shreds local document files.

---

## 2. Distributed Printing Pipeline

```text
Customer Phone (Camera Scan)
  │
  ▼
GET /shop/:publicShopId (Next.js)
  │
  ▼
Upload PDF + Configure Print Settings
  │
  ▼
POST /api/v1/orders (Backend API)
  │
  ▼
Order Created & Development Payment Processed
  │ Status: WAITING
  ▼
Queue Manager & ETA Engine (Calculates queue position)
  │
  ▼
POST /api/v1/dev/orders/:orderId/assign (Printer Assignment)
  │ Status: ASSIGNED
  ▼
Socket.IO Event: `job.assigned` dispatched to Agent Room (`shop:{shopId}`)
  │
  ▼
Windows Agent (.NET 9 Background Service)
  │ 1. Receives payload & enqueues to local SQLite queue
  │ 2. Streaming download from /api/v1/agent/orders/:id/file
  │ 3. Computes SHA-256 checksum & asserts match
  │ 4. Configures DEVMODE (Color, Duplex, PaperSize, Copies)
  │ 5. Sends RAW data to Windows Spooler (WinSpool API)
  │ 6. Reports COMPLETED to /api/v1/agent/orders/:id/status
  │ 7. Zero-Residual Cleanup: Shreds and deletes local PDF
  ▼
Customer Live Status updates to COMPLETED
```

---

## 3. Security & Authorization Boundary

- **Partner Endpoints (`/api/v1/partner/*`)**: Protected by `authenticate` and `authorize('PARTNER', 'ADMIN')`.
- **Shop Owner Endpoints (`/api/v1/shops/:shopId/*`)**: Protected by `requireShopOwner('shopId')`. Enforces `shop.ownerId === req.user.userId`.
- **Public Endpoints (`/api/v1/public/*`)**: Zero-login endpoints returning public shop metadata and issuing short-lived guest tokens.
- **Agent Endpoints (`/api/v1/agent/*`)**: Device-bound HMAC authentication with `DeviceId` + `DeviceKey`.
