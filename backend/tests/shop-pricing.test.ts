import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopService } from '../src/services/shop.service';
import { OrderService } from '../src/services/order.service';
import { prisma } from '../src/database/prisma';

vi.mock('../src/database/prisma', () => {
  return {
    isDbOffline: false,
    setDbOffline: vi.fn(),
    prisma: {
      $transaction: vi.fn(async (cb: any) =>
        cb({
          order: {
            create: vi.fn().mockResolvedValue({
              id: 'order-1',
              orderCode: 'VLX-123456',
              orderStatus: 'ORDER_CREATED',
              createdAt: new Date(),
            }),
          },
          payment: {
            create: vi.fn().mockResolvedValue({ id: 'payment-1' }),
          },
          orderFile: {
            create: vi.fn().mockResolvedValue({ id: 'file-1' }),
          },
          orderEvent: {
            create: vi.fn().mockResolvedValue({ id: 'event-1' }),
          },
        }),
      ),
      shop: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      order: {
        create: vi.fn(),
      },
      file: {
        create: vi.fn(),
      },
      orderTimeline: {
        create: vi.fn(),
      },
    },
  };
});

describe('Shop-Specific Dynamic Pricing (Day 8)', () => {
  const shopService = new ShopService();
  const orderService = new OrderService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Shop Pricing Configuration', () => {
    it('should allow shop owner to configure custom pricing rates', async () => {
      const shopId = 'shop-custom-pricing';
      const ownerId = 'owner-42';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: shopId,
        ownerId,
        name: 'Affordable Prints',
        status: 'ACTIVE',
        pricePerPageBW: 2.0,
        pricePerPageColor: 10.0,
        duplexDiscount: 0.0,
        printers: [],
      } as any);

      vi.mocked(prisma.shop.update).mockResolvedValue({
        id: shopId,
        ownerId,
        name: 'Affordable Prints',
        status: 'ACTIVE',
        pricePerPageBW: 1.5,
        pricePerPageColor: 8.0,
        duplexDiscount: 0.5,
        printers: [],
      } as any);

      const result = await shopService.updatePricing(shopId, ownerId, 'SHOP_OWNER', {
        pricePerPageBW: 1.5,
        pricePerPageColor: 8.0,
        duplexDiscount: 0.5,
      });

      expect(result.pricePerPageBW).toBe(1.5);
      expect(result.pricePerPageColor).toBe(8.0);
      expect(result.duplexDiscount).toBe(0.5);
    });

    it('should reject non-owner from updating shop pricing', async () => {
      const shopId = 'shop-1';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: shopId,
        ownerId: 'legit-owner',
        name: 'Original Shop',
        status: 'ACTIVE',
        printers: [],
      } as any);

      await expect(
        shopService.updatePricing(shopId, 'intruder-id', 'SHOP_OWNER', { pricePerPageBW: 0.5 }),
      ).rejects.toThrow(/You do not have permission to configure pricing for this shop/);
    });
  });

  describe('Dynamic Order Cost Calculation', () => {
    it('should calculate order cost using shop-specific B&W and duplex discount', async () => {
      const shopId = 'shop-custom-rates';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: shopId,
        name: 'Premium Prints',
        status: 'ACTIVE',
        pricePerPageBW: 4.0,
        pricePerPageColor: 15.0,
        duplexDiscount: 1.0,
        printers: [],
      } as any);

      vi.mocked(prisma.order.create).mockResolvedValue({
        id: 'order-1',
        orderCode: 'VLX-123456',
        orderStatus: 'ORDER_CREATED',
        createdAt: new Date(),
      } as any);
      vi.mocked(prisma.file.create).mockResolvedValue({} as any);
      vi.mocked(prisma.orderTimeline.create).mockResolvedValue({} as any);

      const mockFile = {
        originalname: 'notes.pdf',
        filename: 'file-uuid-1.pdf',
        size: 1024,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      // 2 copies, B&W, double-sided:
      // rateBW = 4.0, duplexDiscount = 1.0 -> pricePerPage = 3.0
      // totalPages = 1 page * 2 copies = 2
      // estimatedCost = 2 * 3.0 = 6.0
      const order = await orderService.createOrder(
        { guestSessionId: 'guest-session-1', isGuest: true },
        {
          shopId,
          copies: 2,
          color: 'bw',
          doubleSided: true,
          orientation: 'portrait',
          paperSize: 'a4',
          paymentMethod: 'counter_cash',
        },
        mockFile,
      );

      expect(order.totalPages).toBe(2);
      expect(order.estimatedCost).toBe(6.0);
    });

    it('should calculate order cost using shop-specific Color rate', async () => {
      const shopId = 'shop-custom-rates';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: shopId,
        name: 'Premium Prints',
        status: 'ACTIVE',
        pricePerPageBW: 4.0,
        pricePerPageColor: 15.0,
        duplexDiscount: 0.0,
        printers: [],
      } as any);

      vi.mocked(prisma.order.create).mockResolvedValue({
        id: 'order-2',
        orderCode: 'VLX-654321',
        orderStatus: 'ORDER_CREATED',
        createdAt: new Date(),
      } as any);
      vi.mocked(prisma.file.create).mockResolvedValue({} as any);
      vi.mocked(prisma.orderTimeline.create).mockResolvedValue({} as any);

      const mockFile = {
        originalname: 'poster.pdf',
        filename: 'file-uuid-2.pdf',
        size: 2048,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      // 3 copies, color, single-sided:
      // rateColor = 15.0 -> pricePerPage = 15.0
      // totalPages = 1 page * 3 copies = 3
      // estimatedCost = 3 * 15.0 = 45.0
      const order = await orderService.createOrder(
        { guestSessionId: 'guest-session-2', isGuest: true },
        {
          shopId,
          copies: 3,
          color: 'color',
          doubleSided: false,
          orientation: 'portrait',
          paperSize: 'a4',
          paymentMethod: 'counter_cash',
        },
        mockFile,
      );

      expect(order.totalPages).toBe(3);
      expect(order.estimatedCost).toBe(45.0);
    });
  });
});
