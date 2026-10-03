import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopService } from '../src/services/shop.service';
import { prisma } from '../src/database/prisma';

// Mock Prisma
vi.mock('../src/database/prisma', () => {
  return {
    isDbOffline: false,
    setDbOffline: vi.fn(),
    prisma: {
      shop: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

describe('Multi-Shop Architecture & Isolation (Day 7)', () => {
  const shopService = new ShopService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Shop Creation & Public ID Generation', () => {
    it('should create a new shop with ownerId and generate publicShopId', async () => {
      const ownerId = 'owner-uuid-1';
      const input = {
        name: 'Apex Prints',
        phone: '9876543210',
        address: '123 Main St',
        city: 'Bengaluru',
        pincode: '560001',
      };

      vi.mocked(prisma.shop.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.shop.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.shop.create).mockResolvedValue({
        id: 'shop-uuid-1',
        ownerId,
        publicShopId: 'shop_apex_prints',
        name: input.name,
        phone: input.phone,
        address: input.address,
        city: input.city,
        pincode: input.pincode,
        status: 'ACTIVE',
        operatingHours: '9:00 AM - 9:00 PM',
        qrCode: 'qr-code-data',
        createdAt: new Date(),
        updatedAt: new Date(),
        printers: [],
      } as any);

      const shop = await shopService.createShop(ownerId, input);

      expect(shop).toBeDefined();
      expect(shop.ownerId).toBe(ownerId);
      expect(shop.publicShopId).toBeDefined();
      expect(prisma.shop.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId,
            name: input.name,
          }),
        }),
      );
    });
  });

  describe('Multi-Shop Owner Isolation', () => {
    it('should allow owner to update their own shop', async () => {
      const ownerA = 'owner-uuid-a';
      const shopId = 'shop-uuid-a';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: shopId,
        ownerId: ownerA,
        name: 'Shop A Original',
        status: 'ACTIVE',
        printers: [],
      } as any);

      vi.mocked(prisma.shop.update).mockResolvedValue({
        id: shopId,
        ownerId: ownerA,
        name: 'Shop A Updated',
        status: 'ACTIVE',
        printers: [],
      } as any);

      const updated = await shopService.updateShop(shopId, ownerA, { name: 'Shop A Updated' });
      expect(updated.name).toBe('Shop A Updated');
    });

    it('should strictly reject Owner B from updating Owner A shop (403 Forbidden)', async () => {
      const ownerA = 'owner-uuid-a';
      const ownerB = 'owner-uuid-b';
      const shopId = 'shop-uuid-a';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: shopId,
        ownerId: ownerA, // Belongs to Owner A!
        name: 'Shop A Original',
        status: 'ACTIVE',
        printers: [],
      } as any);

      await expect(
        shopService.updateShop(shopId, ownerB, { name: 'Malicious Change' }),
      ).rejects.toThrow(/You do not have permission to update this shop/);
    });
  });

  describe('Public Shop Lookup & Status Enforcing', () => {
    it('should return active shop by publicShopId', async () => {
      const publicId = 'shop_campus_central';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: 'shop-uuid-99',
        publicShopId: publicId,
        name: 'Campus Central Prints',
        status: 'ACTIVE',
        printers: [],
      } as any);

      const publicShop = await shopService.getPublicShop(publicId);
      expect(publicShop.id).toBe('shop-uuid-99');
      expect(publicShop.name).toBe('Campus Central Prints');
    });

    it('should reject lookup if shop is INACTIVE or SUSPENDED', async () => {
      const publicId = 'shop_closed';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: 'shop-uuid-closed',
        publicShopId: publicId,
        name: 'Closed Prints',
        status: 'INACTIVE',
        printers: [],
      } as any);

      await expect(shopService.getPublicShop(publicId)).rejects.toThrow(
        /This print shop is currently inactive/,
      );
    });
  });
});
