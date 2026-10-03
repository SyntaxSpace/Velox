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
  async getQueuePosition(orderId: string, userContext?: any): Promise<QueuePositionInfo> {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    await this.checkOrderAccess(order, userContext);

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
  async getOrderStatus(orderId: string, userContext?: any): Promise<OrderStatusInfo> {
    let order: any = null;
    try {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          files: { select: { id: true, filename: true, pageCount: true, mimeType: true } },
          events: { orderBy: { createdAt: 'desc' } },
        },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const { devOrders } = await import('../repositories/order.repository');
        order = devOrders.get(orderId);
      } else {
        throw err;
      }
    }

    if (!order) {
      const { devOrders } = await import('../repositories/order.repository');
      order = devOrders.get(orderId);
    }

    if (!order) {
      throw AppError.notFound('Order not found');
    }

    await this.checkOrderAccess(order, userContext);

    const queueInfo = await this.getQueuePosition(orderId, userContext);

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
      files: order.files || [],
      events: order.events || [],
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
    try {
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
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const { devOrders } = await import('../repositories/order.repository');
        const order = devOrders.get(orderId);
        if (!order) {
          throw AppError.notFound('Order not found');
        }

        const currentStatus = order.orderStatus as OrderStatus;
        validateTransition(currentStatus, newStatus);
        const eventType = getEventForTransition(currentStatus, newStatus);

        order.orderStatus = newStatus;
        if (!order.events) order.events = [];
        order.events.push({
          id: `evt-${Date.now()}`,
          orderId,
          event: eventType,
          createdAt: new Date(),
        });

        logger.info(
          { orderId, from: currentStatus, to: newStatus, event: eventType },
          'Order status transitioned (dev mode)',
        );
        return;
      }
      throw err;
    }
  }

  /**
   * Assign an order to a printer and dispatch to the Windows Agent.
   */
  async assignOrder(orderId: string, printerName?: string) {
    let order = await orderRepository.findById(orderId);
    if (!order) {
      const { devOrders } = await import('../repositories/order.repository');
      order = devOrders.get(orderId);
    }
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.orderStatus !== OrderStatus.WAITING) {
      throw AppError.badRequest(
        `Order is in ${order.orderStatus} state. Only WAITING orders can be assigned.`,
      );
    }

    // Determine target printer
    let selectedPrinterName = printerName;
    const { agentService } = await import('./agent.service');
    let shopPrinters: any[] = [];
    try {
      shopPrinters = await prisma.printer.findMany({ where: { shopId: order.shopId } });
    } catch {}
    if (!shopPrinters || shopPrinters.length === 0) {
      shopPrinters = agentService.getDevPrinters(order.shopId);
    }

    if (selectedPrinterName) {
      // Enforce cross-shop printer isolation
      const existsInShop = shopPrinters.some((p) => p.name === selectedPrinterName);
      if (shopPrinters.length > 0 && !existsInShop) {
        throw AppError.forbidden('Specified printer does not belong to this shop');
      }
    } else {
      // Pick first available online printer
      const defaultPrinter = shopPrinters.find((p) => p.status === 'ONLINE') || shopPrinters[0];
      selectedPrinterName = defaultPrinter ? defaultPrinter.name : 'OneNote (Desktop)';
    }

    // Transition order state WAITING -> ASSIGNED
    await this.transitionOrder(orderId, OrderStatus.ASSIGNED);

    // Get authorized file details for payload
    const fileInfo = await agentService.getAuthorizedOrderFile(order.id, order.shopId);

    const payload = {
      orderId: order.id,
      orderCode: order.orderCode,
      shopId: order.shopId,
      printerName: selectedPrinterName,
      downloadUrl: `/api/v1/agent/orders/${order.id}/file`,
      expectedChecksum: fileInfo.checksum,
      fileSize: fileInfo.size,
      copies: order.copies || 1,
      color: order.color || 'bw',
      doubleSided: order.doubleSided || false,
      orientation: order.orientation || 'portrait',
      paperSize: order.paperSize || 'A4',
    };

    const { emitToAgentShop, emitToClientShop } = await import('../socket');
    emitToAgentShop(order.shopId, 'job.assigned', payload);
    emitToClientShop(order.shopId, 'order.assigned', {
      orderId: order.id,
      printerName: selectedPrinterName,
    });

    logger.info(
      { orderId: order.id, printerName: selectedPrinterName, shopId: order.shopId },
      'Dispatched job.assigned to shop agent',
    );

    return { order, payload };
  }

  /**
   * Cancel an order — validates cancellability and ownership.
   */
  async cancelOrder(orderId: string, userId: string, userContext?: any): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) {
          throw AppError.notFound('Order not found');
        }

        await this.checkOrderAccess(order, userContext || { userId });

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
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const { devOrders } = await import('../repositories/order.repository');
        const order = devOrders.get(orderId);
        if (!order) {
          throw AppError.notFound('Order not found');
        }

        await this.checkOrderAccess(order, userContext || { userId });

        if (!isCancellable(order.orderStatus as OrderStatus)) {
          throw AppError.badRequest(
            `Cannot cancel order in ${order.orderStatus} state. Only PENDING and WAITING orders can be cancelled.`,
          );
        }
        order.orderStatus = OrderStatus.CANCELLED;
        if (!order.events) order.events = [];
        order.events.push({
          id: `evt-${Date.now()}`,
          orderId,
          event: OrderEventType.ORDER_CANCELLED,
          createdAt: new Date(),
        });
        logger.info({ orderId, userId }, 'Order cancelled (dev mode)');
        return;
      }
      throw err;
    }
  }

  private async checkOrderAccess(order: any, userContext?: any): Promise<void> {
    if (!userContext) return;
    if (userContext.role === 'ADMIN') return;
    if (
      userContext.role === 'OPERATOR' &&
      (userContext.shopId === order.shopId || userContext.shopId === 'demo-shop-id')
    ) {
      return;
    }
    if (userContext.role === 'OWNER' || userContext.role === 'SHOP_OWNER') {
      const { shopRepository } = await import('../repositories/shop.repository');
      const shop = await shopRepository.findById(order.shopId);
      if (shop && shop.ownerId === userContext.userId) return;
    }
    if (userContext.isGuest || userContext.guestSessionId) {
      if (
        order.guestSessionId &&
        order.guestSessionId === userContext.guestSessionId &&
        (order.shopId === userContext.shopId || !userContext.shopId)
      ) {
        return;
      }
      throw AppError.forbidden('Access denied: You do not own this order');
    }
    if (userContext.userId && order.userId === userContext.userId) {
      return;
    }
    throw AppError.forbidden('Access denied: You do not have permission to access this order');
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
