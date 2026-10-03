import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '../database/prisma';
import { paymentRepository } from '../repositories/payment.repository';
import { logger } from '../config/logger';
import { AppError } from '../utils/app-error';
import { validateTransition, OrderEventType } from './order-state-machine';
import crypto from 'crypto';

export class PaymentService {
  /**
   * Process a successful payment — transitions order from PENDING to WAITING.
   * Used by development simulation endpoint.
   */
  async processPaymentSuccess(orderId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { payment: true },
        });

        if (!order) {
          throw AppError.notFound('Order not found');
        }

        if (order.orderStatus !== OrderStatus.PENDING) {
          throw AppError.badRequest(
            `Order is in ${order.orderStatus} state. Payment can only be processed for PENDING orders.`,
          );
        }

        // Validate the state transition
        validateTransition(OrderStatus.PENDING, OrderStatus.WAITING);

        // Update or create payment record
        if (order.payment) {
          await paymentRepository.updateStatus(
            order.payment.id,
            PaymentStatus.SUCCESS,
            `DEV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            tx,
          );
        } else {
          const payment = await paymentRepository.create(
            {
              orderId: order.id,
              method: PaymentMethod.COUNTER,
              amount: Number(order.totalPrice),
            },
            tx,
          );
          await paymentRepository.updateStatus(
            payment.id,
            PaymentStatus.SUCCESS,
            `DEV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            tx,
          );
        }

        // Update order payment and order status
        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.SUCCESS,
            orderStatus: OrderStatus.WAITING,
          },
        });

        // Create events
        await tx.orderEvent.createMany({
          data: [
            { orderId, event: OrderEventType.PAYMENT_SUCCESS },
            { orderId, event: OrderEventType.QUEUE_ENTERED },
          ],
        });

        logger.info({ orderId }, 'Payment processed successfully — order entered queue');
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const { devOrders } = await import('../repositories/order.repository');
        const order = devOrders.get(orderId);
        if (!order) {
          throw AppError.notFound('Order not found');
        }
        if (order.orderStatus !== OrderStatus.PENDING) {
          throw AppError.badRequest(
            `Order is in ${order.orderStatus} state. Payment can only be processed for PENDING orders.`,
          );
        }
        validateTransition(OrderStatus.PENDING, OrderStatus.WAITING);
        order.paymentStatus = PaymentStatus.SUCCESS;
        order.orderStatus = OrderStatus.WAITING;
        order.payment = {
          id: `dev-pay-${orderId}`,
          status: PaymentStatus.SUCCESS,
          method: PaymentMethod.COUNTER,
          transactionId: `DEV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          amount: Number(order.totalPrice),
        };
        if (!order.events) order.events = [];
        order.events.push(
          {
            id: `evt-${Date.now()}-1`,
            orderId,
            event: OrderEventType.PAYMENT_SUCCESS,
            createdAt: new Date(),
          },
          {
            id: `evt-${Date.now()}-2`,
            orderId,
            event: OrderEventType.QUEUE_ENTERED,
            createdAt: new Date(),
          },
        );
        logger.info({ orderId }, 'Payment processed successfully (dev mode) — order entered queue');
        return;
      }
      throw err;
    }
  }
}

export const paymentService = new PaymentService();
