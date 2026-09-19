import { Router, Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { queueService } from '../services/queue.service';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../utils/app-error';
import { OrderStatus } from '@prisma/client';

const router = Router();

// POST /dev/payment/:orderId/success - Simulate successful payment
router.post(
  '/payment/:orderId/success',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      await paymentService.processPaymentSuccess(orderId);
      sendSuccess(
        res,
        { orderId, paymentStatus: 'SUCCESS', orderStatus: 'WAITING' },
        'Payment simulated successfully',
      );
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /dev/orders/:orderId/transition - Force transition order status
router.patch(
  '/orders/:orderId/transition',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body as { status?: string };
      if (!status || !Object.values(OrderStatus).includes(status as OrderStatus)) {
        throw AppError.badRequest(
          `Invalid status: ${String(status)}. Valid: ${Object.values(OrderStatus).join(', ')}`,
        );
      }
      await queueService.transitionOrder(orderId, status as OrderStatus);
      sendSuccess(res, { orderId, newStatus: status }, 'Order transitioned successfully');
    } catch (error) {
      next(error);
    }
  },
);

export default router;
