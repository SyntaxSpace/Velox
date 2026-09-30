import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopService } from '../src/services/shop.service';
import { AuthService } from '../src/services/auth.service';
import { prisma } from '../src/database/prisma';

vi.mock('../src/database/prisma', () => {
  return {
    isDbOffline: false,
    setDbOffline: vi.fn(),
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      shop: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      printer: {
        count: vi.fn(),
      },
      order: {
        count: vi.fn(),
        aggregate: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

describe('Partner Platform & Shop Provisioning (Day 8)', () => {
  const shopService = new ShopService();
  const authService = new AuthService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Atomic Shop + Owner Provisioning', () => {
    it('should provision a shop with dedicated owner account and firstLogin flag set to true', async () => {
      const partnerId = 'partner-uuid-admin';
      const input = {
        name: 'Metro Cyber Cafe & Prints',
        phone: '9876543210',
        address: 'MG Road',
        city: 'Bengaluru',
        pincode: '560001',
        ownerName: 'Ramesh Kumar',
        ownerEmail: 'ramesh@metroprints.com',
        ownerPassword: 'TempPassword123!',
        pricePerPageBW: 3.0,
        pricePerPageColor: 12.0,
        duplexDiscount: 1.0,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'owner-uuid-ramesh',
        email: input.ownerEmail,
        name: input.ownerName,
        phone: input.phone,
        role: 'SHOP_OWNER',
        firstLogin: true,
        shopId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.shop.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.shop.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.shop.create).mockResolvedValue({
        id: 'shop-uuid-metro',
        ownerId: 'owner-uuid-ramesh',
        createdByPartnerId: partnerId,
        publicShopId: 'shop_metro_cyber',
        name: input.name,
        phone: input.phone,
        address: input.address,
        city: input.city,
        pincode: input.pincode,
        pricePerPageBW: 3.0,
        pricePerPageColor: 12.0,
        duplexDiscount: 1.0,
        status: 'ACTIVE',
        operatingHours: '8:00 AM - 10:00 PM',
        qrCode: 'qr-data',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'owner-uuid-ramesh',
        email: input.ownerEmail,
        shopId: 'shop-uuid-metro',
      } as any);

      const result = await shopService.provisionShop(partnerId, input);

      expect(result).toBeDefined();
      expect(result.shop.id).toBe('shop-uuid-metro');
      expect(result.shop.createdByPartnerId).toBe(partnerId);
      expect(result.owner.id).toBe('owner-uuid-ramesh');
      expect(result.owner.email).toBe(input.ownerEmail);
      expect(result.temporaryPassword).toBe(input.ownerPassword);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: input.ownerEmail,
            role: 'SHOP_OWNER',
            firstLogin: true,
          }),
        }),
      );

      expect(prisma.shop.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: 'owner-uuid-ramesh',
            createdByPartnerId: partnerId,
            pricePerPageBW: 3.0,
            pricePerPageColor: 12.0,
          }),
        }),
      );
    });

    it('should reject provisioning if the owner email already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-user',
        email: 'taken@example.com',
      } as any);

      await expect(
        shopService.provisionShop('partner-uuid', {
          name: 'New Shop',
          phone: '1234567890',
          address: 'Main St',
          city: 'Delhi',
          pincode: '110001',
          ownerName: 'Existing Owner',
          ownerEmail: 'taken@example.com',
          ownerPassword: 'Password123!',
        }),
      ).rejects.toThrow(/An account with this owner email already exists/);
    });
  });

  describe('Partner Network View & Statistics', () => {
    it('should allow partner to view all shops across the Velox platform', async () => {
      const mockShops = [
        { id: 'shop-1', name: 'Campus Shop', status: 'ACTIVE', printers: [] },
        { id: 'shop-2', name: 'Station Shop', status: 'ACTIVE', printers: [] },
      ];
      vi.mocked(prisma.shop.findMany).mockResolvedValue(mockShops as any);

      const shops = await shopService.getAllShopsForPartner();
      expect(shops).toHaveLength(2);
      expect(shops[0].name).toBe('Campus Shop');
      expect(shops[1].name).toBe('Station Shop');
    });

    it('should aggregate company-level statistics for Partner dashboard', async () => {
      const mockShops = [
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `shop-active-${i}`,
          status: 'ACTIVE',
          printers: [],
        })),
        ...Array.from({ length: 2 }, (_, i) => ({
          id: `shop-inactive-${i}`,
          status: 'INACTIVE',
          printers: [],
        })),
      ];
      vi.mocked(prisma.shop.findMany).mockResolvedValue(mockShops as any);

      const stats = await shopService.getPartnerStats();
      expect(stats.totalShops).toBe(10);
      expect(stats.activeShops).toBe(8);
      expect(stats.inactiveShops).toBe(2);
    });
  });
});
