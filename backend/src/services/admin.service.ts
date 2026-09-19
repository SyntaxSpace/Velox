import { orderRepository } from '../repositories/order.repository';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';
import { agentService } from './agent.service';

export interface DashboardStats {
  todayOrders: number;
  activeOrders: number;
  totalRevenue: number;
  completedToday: number;
}

export class AdminService {
  async getDashboardStats(shopId: string): Promise<DashboardStats> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayOrders, activeOrders, completedToday, revenueResult] = await Promise.all([
      orderRepository.countTodayByShop(shopId),
      orderRepository.getActiveCountByShop(shopId),
      prisma.order.count({
        where: {
          shopId,
          orderStatus: 'COMPLETED',
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.order.aggregate({
        where: {
          shopId,
          createdAt: { gte: startOfDay },
        },
        _sum: { totalPrice: true },
      }),
    ]);

    const totalRevenue = revenueResult._sum.totalPrice ? Number(revenueResult._sum.totalPrice) : 0;

    logger.info({ shopId, todayOrders, activeOrders }, 'Dashboard stats retrieved');

    return { todayOrders, activeOrders, totalRevenue, completedToday };
  }

  async getShopOrders(shopId: string, page: number, limit: number) {
    const result = await orderRepository.findByShopId(shopId, page, limit);
    return result;
  }

  async getTodayOrders(shopId: string) {
    return orderRepository.findTodayByShop(shopId);
  }

  async getShopPrinters(shopId: string) {
    try {
      const [printers, devices] = await Promise.all([
        prisma.printer.findMany({
          where: { shopId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.device.findMany({
          where: { shopId },
          select: {
            deviceId: true,
            name: true,
            status: true,
            lastHeartbeat: true,
          },
        }),
      ]);

      return {
        printers,
        devices,
      };
    } catch (dbErr: any) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return {
          printers: agentService.getDevPrinters(shopId),
          devices: agentService.getDevDevices(shopId),
        };
      }
      throw dbErr;
    }
  }
}

export const adminService = new AdminService();
