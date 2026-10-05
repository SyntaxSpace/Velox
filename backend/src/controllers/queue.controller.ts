import { Request, Response, NextFunction } from 'express';
import { queueService } from '../services/queue.service';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../utils/app-error';

export class QueueController {
  async dispatchNextOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) throw AppError.unauthorized('Authentication required');
      const { shopId, orderId } = req.params;
      const result = await queueService.dispatchNextOrder(orderId, shopId, req.user.userId);
      sendSuccess(res, result, 'Order dispatched to the shop printer');
    } catch (error) {
      next(error);
    }
  }

  async getShopQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const queue = await queueService.getShopQueue(shopId);
      sendSuccess(res, queue, 'Shop queue retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const status = await queueService.getOrderStatus(orderId, req.user);
      sendSuccess(res, status, 'Order status retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getOrderQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const queueInfo = await queueService.getQueuePosition(orderId, req.user);
      sendSuccess(res, queueInfo, 'Queue position retrieved');
    } catch (error) {
      next(error);
    }
  }

  async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || (!req.user.userId && !req.user.guestSessionId)) {
        throw AppError.unauthorized('Authentication required');
      }
      const { orderId } = req.params;
      await queueService.cancelOrder(
        orderId,
        req.user.userId || req.user.guestSessionId!,
        req.user,
      );
      sendSuccess(res, { orderId, status: 'CANCELLED' }, 'Order cancelled successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const queueController = new QueueController();
