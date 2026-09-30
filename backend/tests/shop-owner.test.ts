import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../src/services/auth.service';
import { ShopService } from '../src/services/shop.service';
import { prisma } from '../src/database/prisma';
import argon2 from 'argon2';

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
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

describe('Shop Owner Role & Flow (Day 8)', () => {
  const authService = new AuthService();
  const shopService = new ShopService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Shop Owner Login', () => {
    it('should return shopId and firstLogin flag upon successful owner login', async () => {
      const plainPassword = 'TempPassword123!';
      const passwordHash = await argon2.hash(plainPassword);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'owner-uuid-42',
        email: 'owner42@campusprints.com',
        passwordHash,
        name: 'Suresh Raina',
        role: 'SHOP_OWNER',
        shopId: 'shop-uuid-42',
        firstLogin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const result = await authService.login({
        email: 'owner42@campusprints.com',
        password: plainPassword,
      });

      expect(result.user).toBeDefined();
      expect(result.user.role).toBe('SHOP_OWNER');
      expect(result.user.shopId).toBe('shop-uuid-42');
      expect(result.user.firstLogin).toBe(true);
      expect(result.accessToken).toBeDefined();
    });
  });

  describe('First Login Password Change', () => {
    it('should change password on first login and set firstLogin to false', async () => {
      const initialPassword = 'TempPassword123!';
      const initialHash = await argon2.hash(initialPassword);
      const newPassword = 'NewSecurePassword2026!';

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'owner-uuid-42',
        email: 'owner42@campusprints.com',
        passwordHash: initialHash,
        name: 'Suresh Raina',
        role: 'SHOP_OWNER',
        shopId: 'shop-uuid-42',
        firstLogin: true,
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'owner-uuid-42',
        email: 'owner42@campusprints.com',
        firstLogin: false,
      } as any);

      const result = await authService.firstLoginChangePassword('owner-uuid-42', {
        temporaryPassword: initialPassword,
        newPassword,
      });

      expect(result.user).toBeDefined();
      expect(result.user.firstLogin).toBe(false);
      expect(result.accessToken).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'owner-uuid-42' },
          data: expect.objectContaining({
            firstLogin: false,
          }),
        }),
      );
    });
  });

  describe('Shop Owner Single-Shop Scope & Isolation', () => {
    it('should strictly prevent owner from updating another shop', async () => {
      const owner1 = 'owner-uuid-1';
      const shop2Id = 'shop-uuid-2';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: shop2Id,
        ownerId: 'owner-uuid-2', // Belongs to different owner
        name: 'Shop 2',
        status: 'ACTIVE',
        printers: [],
      } as any);

      await expect(
        shopService.updateShop(shop2Id, owner1, { name: 'Unauthorized Name' }, 'SHOP_OWNER'),
      ).rejects.toThrow(/You do not have permission to update this shop/);
    });

    it('should allow partner or admin to update any shop', async () => {
      const partnerId = 'partner-uuid-admin';
      const shopId = 'shop-uuid-2';

      vi.mocked(prisma.shop.findFirst).mockResolvedValue({
        id: shopId,
        ownerId: 'owner-uuid-2',
        name: 'Shop 2',
        status: 'ACTIVE',
        printers: [],
      } as any);

      vi.mocked(prisma.shop.update).mockResolvedValue({
        id: shopId,
        ownerId: 'owner-uuid-2',
        name: 'Shop 2 Updated by Partner',
        status: 'ACTIVE',
        printers: [],
      } as any);

      const updated = await shopService.updateShop(
        shopId,
        partnerId,
        { name: 'Shop 2 Updated by Partner' },
        'PARTNER',
      );

      expect(updated.name).toBe('Shop 2 Updated by Partner');
    });
  });
});
