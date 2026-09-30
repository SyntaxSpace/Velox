import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { ACTIVE_QUEUE_STATES } from '../services/order-state-machine';
import { devOrders } from './order.repository';

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
    try {
      const client = tx || prisma;
      const where: Prisma.OrderWhereInput = {
        shopId,
        orderStatus: { in: ACTIVE_QUEUE_STATES },
        createdAt: { lt: createdAt },
      };
      if (excludeOrderId) {
        where.id = { not: excludeOrderId };
      }
      return await client.order.count({ where });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const refTime = new Date(createdAt).getTime();
        const orders = Array.from(devOrders.values()).filter(
          (o) =>
            o.shopId === shopId &&
            ACTIVE_QUEUE_STATES.includes(o.orderStatus) &&
            new Date(o.createdAt).getTime() < refTime &&
            (!excludeOrderId || o.id !== excludeOrderId),
        );
        return orders.length;
      }
      throw err;
    }
  }

  /**
   * Sum total pages of all active orders ahead in the queue.
   */
  async sumPagesAhead(
    shopId: string,
    createdAt: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    try {
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
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const refTime = new Date(createdAt).getTime();
        const orders = Array.from(devOrders.values()).filter(
          (o) =>
            o.shopId === shopId &&
            ACTIVE_QUEUE_STATES.includes(o.orderStatus) &&
            new Date(o.createdAt).getTime() < refTime,
        );
        return orders.reduce((sum, o) => sum + (o.totalPages || 0), 0);
      }
      throw err;
    }
  }

  /**
   * Get all active queue orders for a shop, ordered by creation time.
   */
  async getActiveOrders(shopId: string, tx?: Prisma.TransactionClient) {
    try {
      const client = tx || prisma;
      return await client.order.findMany({
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
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return Array.from(devOrders.values())
          .filter((o) => o.shopId === shopId && ACTIVE_QUEUE_STATES.includes(o.orderStatus))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      throw err;
    }
  }

  /**
   * Get average pages per minute across online printers for a shop.
   */
  async getAveragePPM(shopId: string, tx?: Prisma.TransactionClient): Promise<number> {
    try {
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
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return 20;
      }
      throw err;
    }
  }

  /**
   * Count total active orders in queue for a shop.
   */
  async countActiveOrders(shopId: string, tx?: Prisma.TransactionClient): Promise<number> {
    try {
      const client = tx || prisma;
      return await client.order.count({
        where: {
          shopId,
          orderStatus: { in: ACTIVE_QUEUE_STATES },
        },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return Array.from(devOrders.values()).filter(
          (o) => o.shopId === shopId && ACTIVE_QUEUE_STATES.includes(o.orderStatus),
        ).length;
      }
      throw err;
    }
  }
}

export const queueRepository = new QueueRepository();
