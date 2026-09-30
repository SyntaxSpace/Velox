# SHOP OWNER OPERATIONS

The Velox Shop Owner Dashboard provides real-world print counter functionality without relying on backend commands or API clients.

## Key Capabilities

1. **Dashboard Overview (`/shop-owner`)**:
   Provides immediate operational awareness. KPIs fetch directly from PostgreSQL (via `getShopDashboard`) tracking Today's Orders, Active Queue counts, Completed Prints, and Revenue calculated exclusively from successful transactions.

2. **Live Print Queue (`/shop-owner/queue`)**:
   Socket.IO powered real-time visualization of incoming print jobs. Order cards detail position, waiting times (ETA calculated by shop PPM averages), customer metadata, and spooling statuses (`WAITING`, `PRINTING`, `COMPLETED`).

3. **Order History & Details (`/shop-owner/orders` & `/shop-owner/orders/[orderId]`)**:
   Complete visibility into past and active prints. Order details surface file specifications (color, duplex, copies, page sizes) and a sequential event timeline tracing the order's lifecycle.

4. **Hardware Fleet & Edge Agent (`/shop-owner/printers`)**:
   Tracks connected Windows Agent installations and discovered local spooler printers. Shop owners can monitor if their printing hardware goes offline or disconnects, aiding rapid hardware debugging.

5. **Customer Counter Stand (`/shop-owner/qr`)**:
   A printable high-resolution physical stand card displaying the shop's public QR code. Customers simply scan at the counter to bypass logins and instantly launch the web app for document uploading.

6. **Transactions & Ledgers (`/shop-owner/transactions`)**:
   Validates financial data per shop, securely isolating transactions so Owners only see their own revenue streams.

## Technical Architecture

- **Backend Integration**: Driven by `ShopController` and `OrderService`. Enforces strict `SHOP_OWNER` RBAC authorization rules so operators and owners only query rows associated with their `shopId`.
- **Frontend Client**: Built on Next.js 14 utilizing `@tanstack/react-query` for optimized fetching and caching of dashboard data, backed by a persistent Token-based or NextAuth session wrapper.
- **WebSocket Synchronization**: Subscribes to `join.shop` channels. Whenever an Edge Agent changes a job status, a `queue.updated` or `order.status.changed` event dynamically refetches frontend queries, negating the need for manual browser refreshes.
