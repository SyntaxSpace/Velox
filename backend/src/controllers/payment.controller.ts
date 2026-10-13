import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../utils/app-error';

export class PaymentController {
  async createRazorpayOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        throw AppError.badRequest('Order ID is required');
      }

      const result = await paymentService.createRazorpayOrder(orderId, req.user);
      sendSuccess(res, result, 'Razorpay order created successfully');
    } catch (error) {
      next(error);
    }
  }

  async verifyRazorpayPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw AppError.badRequest(
          'Missing required payment verification parameters: orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature',
        );
      }

      const result = await paymentService.verifyRazorpayPayment(
        { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature },
        req.user,
      );
      sendSuccess(res, result, 'Payment verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      if (!signature) {
        throw AppError.badRequest('Missing x-razorpay-signature header');
      }

      const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
      const result = await paymentService.handleRazorpayWebhook(rawBody, signature);
      res.status(200).json({ status: 'ok', ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
