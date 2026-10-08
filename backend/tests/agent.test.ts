import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentService } from '../src/services/agent.service';
import { prisma } from '../src/database/prisma';
import { verifyAccessToken } from '../src/config/jwt';
import { AppError } from '../src/utils/app-error';

vi.mock('../src/config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock prisma for unit testing AgentService logic
vi.mock('../src/database/prisma', () => {
  return {
    prisma: {
      shop: {
        findUnique: vi.fn(),
      },
      device: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      printer: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      order: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe('Agent Service & Device Binding', () => {
  const agentService = new AgentService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateDevice', () => {
    const validDto = {
      shopId: '11111111-1111-1111-1111-111111111111',
      deviceId: 'agent-dev-001',
      deviceKey: 'secret_key_123',
      deviceName: 'Main Shop PC',
    };

    it('should authenticate and bind a new device to a shop', async () => {
      vi.mocked(prisma.shop.findUnique).mockResolvedValue({
        id: validDto.shopId,
        name: 'QuickPrint Hub',
      } as any);

      vi.mocked(prisma.device.findUnique).mockResolvedValue(null);

      vi.mocked(prisma.device.create).mockResolvedValue({
        id: 'dev-uuid-1',
        deviceId: validDto.deviceId,
        shopId: validDto.shopId,
        name: validDto.deviceName,
        deviceKey: validDto.deviceKey,
        status: 'ONLINE',
        lastHeartbeat: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await agentService.authenticateDevice(validDto);

      expect(result.token).toBeDefined();
      expect(result.device.deviceId).toBe(validDto.deviceId);
      expect(result.device.shopId).toBe(validDto.shopId);

      const decoded = verifyAccessToken(result.token);
      expect(decoded.role).toBe('AGENT');
      expect(decoded.deviceId).toBe(validDto.deviceId);
      expect(decoded.shopId).toBe(validDto.shopId);
    });

    it('should reject authentication if shop does not exist', async () => {
      vi.mocked(prisma.shop.findUnique).mockResolvedValue(null);

      await expect(agentService.authenticateDevice(validDto)).rejects.toThrow(/Shop not found/);
    });

    it('should reject cross-shop binding (Device bound to Shop A cannot register as Shop B)', async () => {
      vi.mocked(prisma.shop.findUnique).mockResolvedValue({
        id: '22222222-2222-2222-2222-222222222222', // Shop B
        name: 'Another Shop',
      } as any);

      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        id: 'dev-uuid-1',
        deviceId: validDto.deviceId,
        shopId: '11111111-1111-1111-1111-111111111111', // Shop A
        deviceKey: validDto.deviceKey,
      } as any);

      await expect(
        agentService.authenticateDevice({
          ...validDto,
          shopId: '22222222-2222-2222-2222-222222222222',
        }),
      ).rejects.toThrow(/Device is bound to another shop/);
    });

    it('should reject invalid device key for existing device', async () => {
      vi.mocked(prisma.shop.findUnique).mockResolvedValue({
        id: validDto.shopId,
        name: 'QuickPrint Hub',
      } as any);

      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        id: 'dev-uuid-1',
        deviceId: validDto.deviceId,
        shopId: validDto.shopId,
        deviceKey: 'correct_key',
      } as any);

      await expect(
        agentService.authenticateDevice({
          ...validDto,
          deviceKey: 'wrong_key',
        }),
      ).rejects.toThrow(/Invalid device credentials/);
    });
  });

  describe('recordHeartbeat', () => {
    it('should update device status to ONLINE and update timestamp', async () => {
      const shopId = '11111111-1111-1111-1111-111111111111';
      const deviceId = 'agent-dev-001';

      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        id: 'dev-uuid-1',
        deviceId,
        shopId,
      } as any);

      vi.mocked(prisma.device.update).mockResolvedValue({} as any);

      const result = await agentService.recordHeartbeat(shopId, deviceId);
      expect(result.success).toBe(true);
      expect(prisma.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-uuid-1' },
          data: expect.objectContaining({ status: 'ONLINE' }),
        }),
      );
    });
  });

  describe('checkStaleDevices', () => {
    it('should mark devices with missing heartbeats as OFFLINE', async () => {
      vi.mocked(prisma.device.updateMany).mockResolvedValue({ count: 2 });

      const offlineCount = await agentService.checkStaleDevices(90);
      expect(offlineCount).toBe(2);
      expect(prisma.device.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ONLINE' }),
          data: { status: 'OFFLINE' },
        }),
      );
    });
  });

  describe('syncPrinters', () => {
    const shopId = '11111111-1111-1111-1111-111111111111';
    const deviceId = 'agent-dev-001';

    it('should reject printer sync if device belongs to another shop', async () => {
      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        id: 'dev-1',
        deviceId,
        shopId: 'different-shop-id',
      } as any);

      await expect(
        agentService.syncPrinters(shopId, deviceId, [{ name: 'Canon LBP2900' }]),
      ).rejects.toThrow(/Invalid device for this shop/);
    });

    it('should upsert printers idempotently without duplicating', async () => {
      vi.mocked(prisma.device.findUnique).mockResolvedValue({
        id: 'dev-1',
        deviceId,
        shopId,
      } as any);

      // First printer exists, second is new
      vi.mocked(prisma.printer.findFirst)
        .mockResolvedValueOnce({
          id: 'printer-1',
          shopId,
          name: 'Canon LBP2900',
          printerType: 'BLACK_WHITE',
          pagesPerMinute: 12,
        } as any)
        .mockResolvedValueOnce(null);

      vi.mocked(prisma.printer.update).mockResolvedValue({
        id: 'printer-1',
        shopId,
        name: 'Canon LBP2900',
        status: 'ONLINE',
      } as any);

      vi.mocked(prisma.printer.create).mockResolvedValue({
        id: 'printer-2',
        shopId,
        name: 'Microsoft Print to PDF',
        status: 'ONLINE',
      } as any);

      const result = await agentService.syncPrinters(shopId, deviceId, [
        { name: 'Canon LBP2900', printerType: 'BLACK_WHITE' as any, status: 'ONLINE' as any },
        {
          name: 'Microsoft Print to PDF',
          printerType: 'BLACK_WHITE' as any,
          status: 'ONLINE' as any,
        },
      ]);

      expect(result.synced).toBe(2);
      expect(prisma.printer.update).toHaveBeenCalledTimes(1);
      expect(prisma.printer.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cloud Pairing Flow', () => {
    const testShopId = '33333333-3333-3333-3333-333333333333';

    it('should generate a 6-digit pairing code for a valid shop', async () => {
      vi.mocked(prisma.shop.findUnique).mockResolvedValue({
        id: testShopId,
        name: 'MGM University',
      } as any);

      const result = await agentService.createPairingCode(testShopId);

      expect(result.pairingCode).toBeDefined();
      expect(result.pairingCode).toMatch(/^\d{6}$/);
      expect(result.shopId).toBe(testShopId);
      expect(result.shopName).toBe('MGM University');
      expect(result.validForMinutes).toBe(15);
    });

    it('should pair a new device using the 6-digit pairing code and issue JWT', async () => {
      vi.mocked(prisma.shop.findUnique).mockResolvedValue({
        id: testShopId,
        name: 'MGM University',
      } as any);

      const pairing = await agentService.createPairingCode(testShopId);

      vi.mocked(prisma.device.create).mockImplementation(async (args: any) => ({
        id: 'dev-new-uuid',
        ...args.data,
      }));

      const paired = await agentService.pairDeviceWithCode(
        pairing.pairingCode,
        'Desk PC 01',
        'Windows 11 Pro',
      );

      expect(paired.shopId).toBe(testShopId);
      expect(paired.deviceId).toMatch(/^VELOX-MGM-AGENT-[0-9A-F]{6}$/);
      expect(paired.deviceKey).toBeDefined();
      expect(paired.token).toBeDefined();

      const decoded = verifyAccessToken(paired.token);
      expect(decoded.role).toBe('AGENT');
      expect(decoded.shopId).toBe(testShopId);
      expect(decoded.deviceId).toBe(paired.deviceId);

      // Verify code cannot be reused (single-use)
      await expect(
        agentService.pairDeviceWithCode(pairing.pairingCode, 'Another PC'),
      ).rejects.toThrow(/Invalid pairing code/);
    });

    it('should reject invalid or non-existent pairing code', async () => {
      await expect(agentService.pairDeviceWithCode('999999', 'Fake PC')).rejects.toThrow(
        /Invalid pairing code/,
      );
    });
  });
});
