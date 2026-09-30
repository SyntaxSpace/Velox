import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { shopRepository } from '../repositories/shop.repository';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../utils/app-error';

export class OrderController {
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || (!req.user.userId && !req.user.guestSessionId)) {
        throw AppError.unauthorized(
          'Authentication required: user login or guest session required',
        );
      }
      if (!req.file) {
        throw AppError.badRequest('File is required');
      }

      // Strict Cross-Shop Validation: If guest session, enforce matching shop
      if (req.user.isGuest && req.user.shopId) {
        const targetShop = await shopRepository.findById(req.body.shopId);
        if (!targetShop) {
          throw AppError.notFound('Shop not found');
        }
        if (targetShop.id !== req.user.shopId && targetShop.publicShopId !== req.user.shopId) {
          throw AppError.forbidden('Guest session is not authorized for this shop');
        }
      }

      const result = await orderService.createOrder(
        {
          userId: req.user.userId,
          guestSessionId: req.user.guestSessionId,
          isGuest: req.user.isGuest,
        },
        req.body,
        req.file,
      );
      sendSuccess(res, result, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrderById(orderId, req.user);
      sendSuccess(res, order, 'Order retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
