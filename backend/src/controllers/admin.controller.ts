import { Request, Response, NextFunction } from 'express';
import { OrderStatus } from '@prisma/client';
import { adminService } from '../services/admin.service';
import { queueService } from '../services/queue.service';
import { prisma } from '../database/prisma';
import { sendSuccess, sendPaginated } from '../utils/api-response';
import { AppError } from '../utils/app-error';

export class AdminController {
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw AppError.unauthorized();
      }
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user?.shopId) {
        throw AppError.badRequest('User is not associated with a shop');
      }

      const stats = await adminService.getDashboardStats(user.shopId);
      sendSuccess(res, stats, 'Dashboard stats retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw AppError.unauthorized();
      }
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user?.shopId) {
        throw AppError.badRequest('User is not associated with a shop');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { orders, total } = await adminService.getShopOrders(user.shopId, page, limit);
      sendPaginated(res, orders, total, page, limit, 'Orders retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getTodayOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw AppError.unauthorized();
      }
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user?.shopId) {
        throw AppError.badRequest('User is not associated with a shop');
      }

      const orders = await adminService.getTodayOrders(user.shopId);
      sendSuccess(res, orders, "Today's orders retrieved");
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw AppError.unauthorized();
      }
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user?.shopId) {
        throw AppError.badRequest('User is not associated with a shop');
      }

      const { orderId } = req.params;
      const { status } = req.body as { status?: string };

      // Verify order belongs to admin's shop
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.shopId !== user.shopId) {
        throw AppError.notFound('Order not found in your shop');
      }

      const validStatuses = Object.values(OrderStatus) as string[];
      if (!status || !validStatuses.includes(status)) {
        throw AppError.badRequest(`Invalid status: ${String(status)}`);
      }

      await queueService.transitionOrder(orderId, status as OrderStatus);
      sendSuccess(res, { orderId, newStatus: status }, 'Order status updated');
    } catch (error) {
      next(error);
    }
  }

  async getQueueOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw AppError.unauthorized();
      }
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user?.shopId) {
        throw AppError.badRequest('User is not associated with a shop');
      }

      const queue = await queueService.getShopQueue(user.shopId);
      sendSuccess(res, queue, 'Queue retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getPrinters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw AppError.unauthorized();
      }

      let shopId = req.user.shopId;
      if (!shopId) {
        try {
          const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
          shopId = user?.shopId || undefined;
        } catch {
          if (process.env.NODE_ENV === 'development') {
            shopId = 'demo-shop-id';
          }
        }
      }

      if (!shopId && process.env.NODE_ENV === 'development') {
        shopId = 'demo-shop-id';
      }

      if (!shopId) {
        throw AppError.badRequest('User is not associated with a shop');
      }

      const data = await adminService.getShopPrinters(shopId);
      sendSuccess(res, data, 'Printers retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updatePrinterStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        throw AppError.unauthorized();
      }

      const { printerId } = req.params;
      const { status } = req.body as { status: any };

      let shopId = req.user.shopId;
      if (!shopId && process.env.NODE_ENV === 'development') {
        shopId = 'demo-shop-id';
      }

      try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (user?.shopId) shopId = user.shopId;

        const printer = await prisma.printer.findUnique({ where: { id: printerId } });
        if (!printer || printer.shopId !== shopId) {
          throw AppError.notFound('Printer not found in your shop');
        }

        const updated = await prisma.printer.update({
          where: { id: printerId },
          data: { status },
        });

        sendSuccess(res, updated, 'Printer status updated');
      } catch (dbErr: any) {
        if (dbErr instanceof AppError) throw dbErr;
        if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
          const printers = adminService.getShopPrinters
            ? (await adminService.getShopPrinters(shopId || 'demo-shop-id')).printers
            : [];
          const p = printers.find((x: any) => x.id === printerId);
          if (p) p.status = status;
          sendSuccess(res, { id: printerId, status }, 'Printer status updated (dev mode)');
          return;
        }
        throw dbErr;
      }
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
