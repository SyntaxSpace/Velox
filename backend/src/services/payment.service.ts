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
  }
}

export const paymentService = new PaymentService();
