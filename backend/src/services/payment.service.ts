import { OrderStatus, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { paymentRepository } from '../repositories/payment.repository';
import { logger } from '../config/logger';
import { AppError } from '../utils/app-error';
import { validateTransition, OrderEventType } from './order-state-machine';
import { emitToClientShop } from '../socket';
import crypto from 'crypto';

export class PaymentService {
  async confirmCounterPayment(
    orderId: string,
    shopId: string,
    ownerId: string,
  ): Promise<{ orderId: string; orderStatus: OrderStatus; alreadyConfirmed: boolean }> {
    const result = await prisma.$transaction(async (tx) => {
      // Serialize cash confirmation and dispatch decisions for this shop.
      const shops = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM shops WHERE id = ${shopId}::uuid FOR UPDATE`,
      );
      if (shops.length === 0) throw AppError.notFound('Shop not found');

      const shop = await tx.shop.findUnique({
        where: { id: shopId },
        select: { ownerId: true, status: true },
      });
      if (!shop || shop.ownerId !== ownerId) {
        throw AppError.forbidden('You do not own this shop');
      }
      if (shop.status !== 'ACTIVE') {
        throw AppError.conflict('This shop is not active');
      }

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });
      if (!order) throw AppError.notFound('Order not found');
      if (order.shopId !== shopId) {
        throw AppError.forbidden('This order does not belong to your shop');
      }

      const payment = order.payment;
      if (!payment || payment.method !== PaymentMethod.COUNTER) {
        throw AppError.badRequest('Only pay-at-counter orders can be confirmed here');
      }

      if (
        payment.status === PaymentStatus.SUCCESS &&
        order.paymentStatus === PaymentStatus.SUCCESS &&
        order.orderStatus !== OrderStatus.PENDING
      ) {
        return { orderId, orderStatus: order.orderStatus, alreadyConfirmed: true };
      }

      if (
        payment.status !== PaymentStatus.PENDING ||
        order.paymentStatus !== PaymentStatus.PENDING ||
        order.orderStatus !== OrderStatus.PENDING
      ) {
        throw AppError.conflict('This order is no longer awaiting counter payment');
      }

      validateTransition(OrderStatus.PENDING, OrderStatus.WAITING);
      const paymentUpdate = await tx.payment.updateMany({
        where: { id: payment.id, method: PaymentMethod.COUNTER, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.SUCCESS },
      });
      if (paymentUpdate.count !== 1) {
        throw AppError.conflict('Counter payment was already processed');
      }

      const orderUpdate = await tx.order.updateMany({
        where: {
          id: orderId,
          shopId,
          orderStatus: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        },
        data: { paymentStatus: PaymentStatus.SUCCESS, orderStatus: OrderStatus.WAITING },
      });
      if (orderUpdate.count !== 1) {
        throw AppError.conflict('Order state changed before payment confirmation');
      }

      await tx.transaction.create({
        data: {
          shopId,
          orderId,
          amount: payment.amount,
          paymentMethod: PaymentMethod.COUNTER,
        },
      });
      await tx.orderEvent.createMany({
        data: [
          { orderId, event: OrderEventType.COUNTER_PAYMENT_CONFIRMED },
          { orderId, event: OrderEventType.PAYMENT_SUCCESS },
          { orderId, event: OrderEventType.QUEUE_ENTERED },
        ],
      });

      return { orderId, orderStatus: OrderStatus.WAITING, alreadyConfirmed: false };
    });

    if (!result.alreadyConfirmed) {
      emitToClientShop(shopId, 'order.status.changed', {
        orderId,
        orderStatus: result.orderStatus,
        paymentStatus: PaymentStatus.SUCCESS,
      });
      emitToClientShop(shopId, 'queue.updated', { shopId, orderId });
      logger.info({ orderId, shopId, ownerId }, 'Counter payment confirmed by shop owner');
    }

    return result;
  }

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
