import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger';
import { generateAgentToken } from '../config/jwt';
import { PrinterType, PrinterStatus } from '@prisma/client';

export interface AgentLoginDto {
  shopId: string;
  deviceId: string;
  deviceKey: string;
  deviceName?: string;
}

export interface DiscoveredPrinterDto {
  name: string;
  printerType?: 'BLACK_WHITE' | 'COLOR' | 'BULK';
  status?: 'ONLINE' | 'OFFLINE' | 'PRINTING' | 'PAUSED';
  pagesPerMinute?: number;
  ipAddress?: string;
}

// In-memory dev storage when database server is offline in development mode
const devDevices = new Map<string, any>([
  [
    'agent-dev-001',
    {
      id: 'dev-agent-dev-001',
      deviceId: 'agent-dev-001',
      shopId: 'demo-shop-id',
      name: 'Shop-Main-PC',
      deviceKey: 'agent_secret_key_dev',
      status: 'ONLINE',
      lastHeartbeat: new Date(),
    },
  ],
]);

const devPrinters = new Map<string, any[]>([
  [
    'demo-shop-id',
    [
      {
        id: 'printer-dev-1',
        shopId: 'demo-shop-id',
        name: 'Microsoft Print to PDF',
        printerType: 'COLOR',
        status: 'ONLINE',
        pagesPerMinute: 20,
        ipAddress: 'WinSpool / Local',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'printer-dev-2',
        shopId: 'demo-shop-id',
        name: 'OneNote (Desktop)',
        printerType: 'COLOR',
        status: 'ONLINE',
        pagesPerMinute: 15,
        ipAddress: 'WinSpool / Local',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'printer-dev-3',
        shopId: 'demo-shop-id',
        name: 'OneNote (Desktop) - Protected',
        printerType: 'COLOR',
        status: 'ONLINE',
        pagesPerMinute: 15,
        ipAddress: 'WinSpool / Local',
        createdAt: new Date().toISOString(),
      },
    ],
  ],
]);

export class AgentService {
  getDevPrinters(shopId: string) {
    return devPrinters.get(shopId) || [];
  }

  getDevDevices(shopId: string) {
    const devices = Array.from(devDevices.values()).filter((d) => d.shopId === shopId);
    if (shopId === 'demo-shop-id') {
      devices.push({
        id: 'dev-velox-agent-01',
        deviceId: 'VELOX-DEMO-AGENT-01',
        shopId: 'demo-shop-id',
        name: 'VELOX-DEMO-AGENT-01',
        deviceKey: 'agent_secret_key_demo_2026',
        status: 'ONLINE',
        lastHeartbeat: new Date(),
      });
    }
    return devices;
  }

  /**
   * Authenticate a device and bind it to a shop.
   */
  async authenticateDevice(dto: AgentLoginDto) {
    const { shopId, deviceId, deviceKey, deviceName } = dto;

    if (!shopId || !deviceId || !deviceKey) {
      throw AppError.badRequest('shopId, deviceId, and deviceKey are required');
    }

    try {
      // Verify shop exists
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
      });
      if (!shop) {
        throw AppError.notFound('Shop not found');
      }

      // Check existing device
      let device = await prisma.device.findUnique({
        where: { deviceId },
      });

      if (device) {
        // Prevent cross-shop binding: Device A registered to Shop A cannot register as Shop B
        if (device.shopId !== shopId) {
          logger.warn(
            { deviceId, registeredShopId: device.shopId, attemptedShopId: shopId },
            'Cross-shop device registration attempt rejected',
          );
          throw AppError.forbidden('Device is bound to another shop');
        }

        // Verify device key (simple equality or hashed verification)
        if (device.deviceKey !== deviceKey) {
          throw AppError.unauthorized('Invalid device credentials');
        }

        // Update heartbeat & status
        device = await prisma.device.update({
          where: { id: device.id },
          data: {
            status: 'ONLINE',
            lastHeartbeat: new Date(),
            name: deviceName || device.name,
          },
        });
      } else {
        // First-time device registration for this shop
        device = await prisma.device.create({
          data: {
            deviceId,
            shopId,
            name: deviceName || `Agent-${deviceId.substring(0, 8)}`,
            deviceKey,
            status: 'ONLINE',
            lastHeartbeat: new Date(),
          },
        });
        logger.info({ deviceId, shopId }, 'New device bound to shop');
      }

      const token = generateAgentToken({ deviceId, shopId, role: 'AGENT' });

      return {
        token,
        device: {
          id: device.id,
          deviceId: device.deviceId,
          name: device.name,
          shopId: device.shopId,
          status: device.status,
        },
      };
    } catch (dbErr: any) {
      if (dbErr instanceof AppError) throw dbErr;
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        logger.warn(
          { shopId, error: dbErr.message },
          'Database offline; using dev in-memory agent auth fallback',
        );
        let dev = devDevices.get(deviceId);
        if (dev && dev.shopId !== shopId) {
          throw AppError.forbidden('Device is bound to another shop');
        }
        if (dev && dev.deviceKey !== deviceKey) {
          throw AppError.unauthorized('Invalid device credentials');
        }
        if (!dev) {
          dev = {
            id: 'dev-' + deviceId,
            deviceId,
            shopId,
            name: deviceName || `Agent-${deviceId.substring(0, 8)}`,
            deviceKey,
            status: 'ONLINE',
            lastHeartbeat: new Date(),
          };
          devDevices.set(deviceId, dev);
        } else {
          dev.status = 'ONLINE';
          dev.lastHeartbeat = new Date();
          if (deviceName) dev.name = deviceName;
        }

        const token = generateAgentToken({ deviceId, shopId, role: 'AGENT' });
        return {
          token,
          device: {
            id: dev.id,
            deviceId: dev.deviceId,
            name: dev.name,
            shopId: dev.shopId,
            status: dev.status,
          },
        };
      }
      throw dbErr;
    }
  }

  /**
   * Record agent heartbeat and update online status.
   */
  async recordHeartbeat(shopId: string, deviceId: string) {
    try {
      const device = await prisma.device.findUnique({
        where: { deviceId },
      });

      if (!device) {
        throw AppError.notFound('Device not found');
      }

      if (device.shopId !== shopId) {
        throw AppError.forbidden('Device does not belong to this shop');
      }

      await prisma.device.update({
        where: { id: device.id },
        data: {
          lastHeartbeat: new Date(),
          status: 'ONLINE',
        },
      });

      return { success: true, timestamp: new Date() };
    } catch (dbErr: any) {
      if (dbErr instanceof AppError) throw dbErr;
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        let dev = devDevices.get(deviceId);
        if (dev) {
          dev.lastHeartbeat = new Date();
          dev.status = 'ONLINE';
        } else {
          devDevices.set(deviceId, {
            id: 'dev-' + deviceId,
            deviceId,
            shopId,
            name: 'Shop-Main-PC',
            status: 'ONLINE',
            lastHeartbeat: new Date(),
          });
        }
        return { success: true, timestamp: new Date() };
      }
      throw dbErr;
    }
  }

  /**
   * Sync discovered printers for an agent's shop.
   * Upserts printers by (shopId, name) so reconnections do not duplicate printers.
   */
  async syncPrinters(shopId: string, deviceId: string, printers: DiscoveredPrinterDto[]) {
    try {
      // Verify device
      const device = await prisma.device.findUnique({ where: { deviceId } });
      if (!device || device.shopId !== shopId) {
        throw AppError.forbidden('Invalid device for this shop');
      }

      const syncedPrinters = [];

      for (const p of printers) {
        if (!p.name) continue;

        const printerType = (p.printerType as PrinterType) || PrinterType.BLACK_WHITE;
        const status = (p.status as PrinterStatus) || PrinterStatus.ONLINE;
        const pagesPerMinute = p.pagesPerMinute || (printerType === PrinterType.COLOR ? 15 : 25);

        const existing = await prisma.printer.findFirst({
          where: { shopId, name: p.name },
        });

        if (existing) {
          const updated = await prisma.printer.update({
            where: { id: existing.id },
            data: {
              status,
              printerType,
              pagesPerMinute: p.pagesPerMinute ?? existing.pagesPerMinute,
            },
          });
          syncedPrinters.push(updated);
        } else {
          const created = await prisma.printer.create({
            data: {
              shopId,
              name: p.name,
              printerType,
              status,
              pagesPerMinute,
              ipAddress: p.ipAddress || null,
            },
          });
          syncedPrinters.push(created);
        }
      }

      return { synced: syncedPrinters.length, printers: syncedPrinters };
    } catch (dbErr: any) {
      if (dbErr instanceof AppError) throw dbErr;
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const list = printers.map((p, idx) => ({
          id: `printer-dev-${idx + 1}`,
          shopId,
          name: p.name,
          printerType: p.printerType || 'COLOR',
          status: p.status || 'ONLINE',
          pagesPerMinute: p.pagesPerMinute || 20,
          ipAddress: p.ipAddress || 'WinSpool / Local',
          createdAt: new Date().toISOString(),
        }));
        devPrinters.set(shopId, list);
        logger.info({ deviceId, count: list.length }, 'Dev mode printers synchronized in-memory');
        return { synced: list.length, printers: list };
      }
      throw dbErr;
    }
  }

  /**
   * Get authorized order file for streaming download with SHA-256 checksum.
   */
  async getAuthorizedOrderFile(orderId: string, shopId: string) {
    let order: any = null;
    try {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { files: true },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const { devOrders } = await import('../repositories/order.repository');
        order = devOrders.get(orderId);
      } else {
        throw err;
      }
    }

    if (!order) {
      const { devOrders } = await import('../repositories/order.repository');
      order = devOrders.get(orderId);
    }

    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.shopId !== shopId) {
      const isDevFallback =
        (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) &&
        shopId === 'demo-shop-id';
      if (!isDevFallback) {
        throw AppError.forbidden('Access denied to orders from another shop');
      }
    }

    if (!order.files || order.files.length === 0) {
      throw AppError.notFound('No file attached to this order');
    }

    const orderFile = order.files[0];
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const safeFilename = path.basename(orderFile.fileUrl);
    const filePath = path.join(uploadsDir, safeFilename);

    // Verify path stays within uploads directory (prevent path traversal)
    if (!filePath.startsWith(uploadsDir)) {
      throw AppError.badRequest('Invalid file path');
    }

    if (!fs.existsSync(filePath)) {
      throw AppError.notFound('Document file not found on disk');
    }

    // Calculate SHA-256 checksum
    const fileBuffer = fs.readFileSync(filePath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    return {
      filePath,
      filename: orderFile.filename,
      mimeType: orderFile.mimeType,
      size: fileBuffer.length,
      checksum,
    };
  }

  /**
   * Check for stale devices that missed heartbeats (older than 90s).
   * Transitions their status to OFFLINE.
   */
  async checkStaleDevices(timeoutSeconds = 90): Promise<number> {
    try {
      const threshold = new Date(Date.now() - timeoutSeconds * 1000);

      const stale = await prisma.device.updateMany({
        where: {
          lastHeartbeat: { lt: threshold },
          status: 'ONLINE',
        },
        data: {
          status: 'OFFLINE',
        },
      });

      if (stale.count > 0) {
        logger.warn({ count: stale.count }, 'Marked stale devices as OFFLINE');
      }
      return stale.count;
    } catch (dbErr: any) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        let count = 0;
        const threshold = Date.now() - timeoutSeconds * 1000;
        for (const dev of devDevices.values()) {
          if (
            dev.lastHeartbeat &&
            dev.lastHeartbeat.getTime() < threshold &&
            dev.status === 'ONLINE'
          ) {
            dev.status = 'OFFLINE';
            count++;
            logger.warn({ deviceId: dev.deviceId }, 'Dev mode: Marked stale device as OFFLINE');
          }
        }
        return count;
      }
      throw dbErr;
    }
  }
}

export const agentService = new AgentService();
