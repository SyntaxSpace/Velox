import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopService } from '../src/services/shop.service';
import { OrderService } from '../src/services/order.service';
import { orderRepository } from '../src/repositories/order.repository';
import { prisma } from '../src/database/prisma';
import { verifyAccessToken } from '../src/config/jwt';

// Mock Prisma and OrderRepository
vi.mock('../src/database/prisma', () => {
  return {
    isDbOffline: false,
    setDbOffline: vi.fn(),
    prisma: {
      shop: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock('../src/repositories/order.repository', () => {
  return {
    orderRepository: {
      findById: vi.fn(),
      createWithFile: vi.fn(),
    },
  };
});

describe('Anonymous Guest Customer Architecture (Day 7)', () => {
  const shopService = new ShopService();
  const orderService = new OrderService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Guest Session Issuance', () => {
    it('should generate a 24-hour anonymous guest JWT bound to shopId', async () => {
      const publicShopId = 'shop_central_prints';
      const shopId = '11111111-1111-1111-1111-111111111111';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: shopId,
        publicShopId,
        name: 'Central Prints',
        status: 'ACTIVE',
        printers: [],
      } as any);

      const session = await shopService.createGuestSession(publicShopId);

      expect(session.guestSessionId).toBeDefined();
      expect(session.sessionToken).toBeDefined();
      expect(session.shopId).toBe(shopId);
      expect(session.publicShopId).toBe(publicShopId);

      const decoded = verifyAccessToken(session.sessionToken);
      expect(decoded.isGuest).toBe(true);
      expect(decoded.role).toBe('CUSTOMER');
      expect(decoded.shopId).toBe(shopId);
      expect(decoded.guestSessionId).toBe(session.guestSessionId);
    });
  });

  describe('Guest Order Authorization & Strict Isolation', () => {
    const shopId = 'shop-1';
    const guestASessionId = 'guest_session_aaa';
    const guestBSessionId = 'guest_session_bbb';
    const orderId = 'order-uuid-1';

    it('should allow Guest A to view their own order', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue({
        id: orderId,
        orderCode: 'ORD-101',
        shopId,
        guestSessionId: guestASessionId,
        userId: null,
        orderStatus: 'PENDING_PAYMENT',
      } as any);

      const order = await orderService.getOrderById(orderId, {
        guestSessionId: guestASessionId,
        shopId,
        isGuest: true,
        role: 'CUSTOMER',
      });

      expect(order).toBeDefined();
      expect(order.id).toBe(orderId);
      expect(order.guestSessionId).toBe(guestASessionId);
    });

    it('should strictly deny Guest B from viewing Guest A order (403 Forbidden)', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue({
        id: orderId,
        orderCode: 'ORD-101',
        shopId,
        guestSessionId: guestASessionId, // Belongs to Guest A!
        userId: null,
      } as any);

      await expect(
        orderService.getOrderById(orderId, {
          guestSessionId: guestBSessionId, // Guest B attempting to access
          shopId,
          isGuest: true,
          role: 'CUSTOMER',
        }),
      ).rejects.toThrow(/Access denied: You do not own this order/);
    });

    it('should strictly deny guest from viewing an order belonging to another shop', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue({
        id: orderId,
        orderCode: 'ORD-101',
        shopId: 'shop-2', // Different shop
        guestSessionId: guestASessionId,
        userId: null,
      } as any);

      await expect(
        orderService.getOrderById(orderId, {
          guestSessionId: guestASessionId,
          shopId: 'shop-1', // Guest token bound to shop-1
          isGuest: true,
          role: 'CUSTOMER',
        }),
      ).rejects.toThrow(/Access denied/);
    });
  });
});
