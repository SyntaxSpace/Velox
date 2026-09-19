import { OrderStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import { queueRepository } from '../repositories/queue.repository';
import { orderRepository } from '../repositories/order.repository';
import { logger } from '../config/logger';
import { AppError } from '../utils/app-error';
import {
  ACTIVE_QUEUE_STATES,
  validateTransition,
  getEventForTransition,
  isCancellable,
  OrderEventType,
} from './order-state-machine';

export interface QueuePositionInfo {
  queuePosition: number;
  peopleAhead: number;
  estimatedWaitSeconds: number;
  totalInQueue: number;
}

export interface ShopQueueInfo {
  shopId: string;
  totalInQueue: number;
  averageWaitSeconds: number;
  orders: ShopQueueOrder[];
}

export interface ShopQueueOrder {
  id: string;
  orderCode: string;
  orderStatus: string;
  queuePosition: number;
  totalPages: number;
  copies: number;
  color: string;
  doubleSided: boolean;
  paperSize: string;
  estimatedWaitSeconds: number;
  createdAt: Date;
  user: { id: string; name: string; email: string };
}

export interface OrderStatusInfo {
  id: string;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  totalPages: number;
  totalPrice: string;
  copies: number;
  color: string;
  doubleSided: boolean;
  orientation: string;
  paperSize: string;
  estimatedWaitSeconds: number;
  queuePosition: number;
  peopleAhead: number;
  createdAt: Date;
  files: Array<{ id: string; filename: string; pageCount: number; mimeType: string }>;
  events: Array<{ id: string; event: string; createdAt: Date }>;
}

const BUFFER_SECONDS = 30;
const DEFAULT_PPM = 20;

export class QueueService {
  /**
   * Calculate queue position for a specific order.
   */
  async getQueuePosition(orderId: string): Promise<QueuePositionInfo> {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    // If order is not in an active queue state, return zeros
    if (!ACTIVE_QUEUE_STATES.includes(order.orderStatus as OrderStatus)) {
      return {
        queuePosition: 0,
        peopleAhead: 0,
        estimatedWaitSeconds: 0,
        totalInQueue: 0,
      };
    }

    const [ordersAhead, pagesAhead, totalInQueue, avgPPM] = await Promise.all([
      queueRepository.countOrdersAhead(order.shopId, order.createdAt),
      queueRepository.sumPagesAhead(order.shopId, order.createdAt),
      queueRepository.countActiveOrders(order.shopId),
      queueRepository.getAveragePPM(order.shopId),
    ]);

    const ppm = avgPPM || DEFAULT_PPM;
    const estimatedWaitSeconds = Math.ceil((pagesAhead / ppm) * 60) + BUFFER_SECONDS;

    return {
      queuePosition: ordersAhead + 1,
      peopleAhead: ordersAhead,
      estimatedWaitSeconds,
      totalInQueue,
    };
  }

  /**
   * Get full order status including queue info.
   */
  async getOrderStatus(orderId: string): Promise<OrderStatusInfo> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        files: { select: { id: true, filename: true, pageCount: true, mimeType: true } },
        events: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw AppError.notFound('Order not found');
    }

    const queueInfo = await this.getQueuePosition(orderId);

    return {
      id: order.id,
      orderCode: order.orderCode,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalPages: order.totalPages,
      totalPrice: order.totalPrice.toString(),
      copies: order.copies,
      color: order.color,
      doubleSided: order.doubleSided,
      orientation: order.orientation,
      paperSize: order.paperSize,
      estimatedWaitSeconds: queueInfo.estimatedWaitSeconds,
      queuePosition: queueInfo.queuePosition,
      peopleAhead: queueInfo.peopleAhead,
      createdAt: order.createdAt,
      files: order.files,
      events: order.events,
    };
  }

  /**
   * Get full shop queue with positions and ETAs.
   */
  async getShopQueue(shopId: string): Promise<ShopQueueInfo> {
    const activeOrders = await queueRepository.getActiveOrders(shopId);
    const avgPPM = await queueRepository.getAveragePPM(shopId);
    const ppm = avgPPM || DEFAULT_PPM;

    let cumulativePages = 0;
    const orders: ShopQueueOrder[] = activeOrders.map((order, index) => {
      const estimatedWaitSeconds = Math.ceil((cumulativePages / ppm) * 60) + BUFFER_SECONDS;
      cumulativePages += order.totalPages;

      return {
        id: order.id,
        orderCode: order.orderCode,
        orderStatus: order.orderStatus,
        queuePosition: index + 1,
        totalPages: order.totalPages,
        copies: order.copies,
        color: order.color,
        doubleSided: order.doubleSided,
        paperSize: order.paperSize,
        estimatedWaitSeconds,
        createdAt: order.createdAt,
        user: order.user,
      };
    });

    const totalPages = activeOrders.reduce((sum, o) => sum + o.totalPages, 0);
    const averageWaitSeconds =
      orders.length > 0 ? Math.ceil((totalPages / ppm / orders.length) * 60) + BUFFER_SECONDS : 0;

    return {
      shopId,
      totalInQueue: orders.length,
      averageWaitSeconds,
      orders,
    };
  }

  /**
   * Transition an order to a new status with validation.
   */
  async transitionOrder(orderId: string, newStatus: OrderStatus): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw AppError.notFound('Order not found');
      }

      const currentStatus = order.orderStatus as OrderStatus;
      validateTransition(currentStatus, newStatus);

      const eventType = getEventForTransition(currentStatus, newStatus);

      await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: newStatus },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          event: eventType,
        },
      });

      logger.info(
        { orderId, from: currentStatus, to: newStatus, event: eventType },
        'Order status transitioned',
      );
    });
  }

  /**
   * Cancel an order — validates cancellability.
   */
  async cancelOrder(orderId: string, userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw AppError.notFound('Order not found');
      }

      if (order.userId !== userId) {
        throw AppError.forbidden('You can only cancel your own orders');
      }

      if (!isCancellable(order.orderStatus as OrderStatus)) {
        throw AppError.badRequest(
          `Cannot cancel order in ${order.orderStatus} state. Only PENDING and WAITING orders can be cancelled.`,
        );
      }

      await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: OrderStatus.CANCELLED },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          event: OrderEventType.ORDER_CANCELLED,
        },
      });

      logger.info({ orderId, userId }, 'Order cancelled');
    });
  }

  /**
   * Calculate ETA in seconds given pages ahead and shop's average PPM.
   */
  calculateETA(pagesAhead: number, avgPPM: number): number {
    const ppm = avgPPM > 0 ? avgPPM : DEFAULT_PPM;
    return Math.ceil((pagesAhead / ppm) * 60) + BUFFER_SECONDS;
  }
}

export const queueService = new QueueService();
