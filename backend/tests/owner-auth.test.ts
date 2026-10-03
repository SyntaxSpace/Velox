import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../src/services/auth.service';
import { prisma } from '../src/database/prisma';
import { verifyAccessToken } from '../src/config/jwt';

// Mock Prisma for AuthService
vi.mock('../src/database/prisma', () => {
  return {
    isDbOffline: false,
    setDbOffline: vi.fn(),
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

describe('Owner Authentication & Authorization (Day 7)', () => {
  const authService = new AuthService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Owner Registration (Day 8: Blocked in favor of Partner Provisioning)', () => {
    it('should reject public registration with OWNER or SHOP_OWNER role', async () => {
      await expect(
        authService.register({
          email: 'owner@shop.com',
          password: 'SecurePassword123!',
          name: 'Shop Owner 1',
          phone: '9876543210',
          role: 'OWNER' as any,
        }),
      ).rejects.toThrow(/Public shop owner registration is disabled/);

      await expect(
        authService.register({
          email: 'shopowner@shop.com',
          password: 'SecurePassword123!',
          name: 'Shop Owner 2',
          role: 'SHOP_OWNER' as any,
        }),
      ).rejects.toThrow(/Public shop owner registration is disabled/);
    });

    it('should strictly reject public registration with ADMIN or PARTNER role', async () => {
      await expect(
        authService.register({
          email: 'hacker@velox.dev',
          password: 'Password123!',
          name: 'Hacker',
          role: 'ADMIN' as any,
        }),
      ).rejects.toThrow(/Cannot self-assign ADMIN role/);

      await expect(
        authService.register({
          email: 'fake-partner@velox.dev',
          password: 'Password123!',
          name: 'Fake Partner',
          role: 'PARTNER' as any,
        }),
      ).rejects.toThrow(/Public shop owner registration is disabled/);
    });

    it('should reject registration if email is already in use for customer', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-id',
        email: 'taken@shop.com',
      } as any);

      await expect(
        authService.register({
          email: 'taken@shop.com',
          password: 'Password123!',
          name: 'Duplicate',
          role: 'CUSTOMER',
        }),
      ).rejects.toThrow(/Email already registered/);
    });
  });

  describe('Owner Token Claims', () => {
    it('should embed OWNER role and userId into JWT access token', async () => {
      const { generateAccessToken } = await import('../src/config/jwt');
      const token = generateAccessToken({
        userId: 'owner-uuid-99',
        email: 'owner99@shop.com',
        role: 'OWNER',
      });

      const decoded = verifyAccessToken(token);
      expect(decoded.role).toBe('OWNER');
      expect(decoded.userId).toBe('owner-uuid-99');
      expect(decoded.isGuest).toBeFalsy();
    });
  });
});
