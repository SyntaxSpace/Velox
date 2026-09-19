import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { ACTIVE_QUEUE_STATES } from '../services/order-state-machine';

export class QueueRepository {
  /**
   * Count active orders ahead of a given order in the same shop.
   * An order is "ahead" if it was created before the reference time
   * and is in an active queue state.
   */
  async countOrdersAhead(
    shopId: string,
    createdAt: Date,
    excludeOrderId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || prisma;
    const where: Prisma.OrderWhereInput = {
      shopId,
      orderStatus: { in: ACTIVE_QUEUE_STATES },
      createdAt: { lt: createdAt },
    };
    if (excludeOrderId) {
      where.id = { not: excludeOrderId };
    }
    return client.order.count({ where });
  }

  /**
   * Sum total pages of all active orders ahead in the queue.
   */
  async sumPagesAhead(
    shopId: string,
    createdAt: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || prisma;
    const result = await client.order.aggregate({
      where: {
        shopId,
        orderStatus: { in: ACTIVE_QUEUE_STATES },
        createdAt: { lt: createdAt },
      },
      _sum: { totalPages: true },
    });
    return result._sum.totalPages || 0;
  }

  /**
   * Get all active queue orders for a shop, ordered by creation time.
   */
  async getActiveOrders(shopId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.order.findMany({
      where: {
        shopId,
        orderStatus: { in: ACTIVE_QUEUE_STATES },
      },
      include: {
        files: { select: { id: true, filename: true, pageCount: true, mimeType: true } },
        user: { select: { id: true, name: true, email: true } },
        payment: { select: { id: true, status: true, method: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get average pages per minute across online printers for a shop.
   */
  async getAveragePPM(shopId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || prisma;
    const result = await client.printer.aggregate({
      where: {
        shopId,
        status: { in: ['ONLINE', 'PRINTING'] },
        pagesPerMinute: { gt: 0 },
      },
      _avg: { pagesPerMinute: true },
    });
    return result._avg.pagesPerMinute || 20; // Default 20 PPM if no printers
  }

  /**
   * Count total active orders in queue for a shop.
   */
  async countActiveOrders(shopId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || prisma;
    return client.order.count({
      where: {
        shopId,
        orderStatus: { in: ACTIVE_QUEUE_STATES },
      },
    });
  }
}

export const queueRepository = new QueueRepository();
