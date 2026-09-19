import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../utils/app-error';

export class OrderController {
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw AppError.unauthorized('Authentication required');
      }
      if (!req.file) {
        throw AppError.badRequest('File is required');
      }

      const result = await orderService.createOrder(req.user.userId, req.body, req.file);
      sendSuccess(res, result, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrderById(orderId);
      sendSuccess(res, order, 'Order retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
