import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentService } from '../src/services/agent.service';
import { prisma } from '../src/database/prisma';
import { verifyAccessToken } from '../src/config/jwt';
import { AppError } from '../utils/app-error';

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
});
