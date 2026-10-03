import { Order, OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import crypto from 'crypto';

export interface CreateOrderData {
  orderCode: string;
  userId?: string;
  guestSessionId?: string;
  shopId: string;
  totalPages: number;
  totalPrice: number;
  copies: number;
  color: string;
  doubleSided: boolean;
  orientation: string;
  paperSize: string;
  paymentMethod: string;
}

export interface CreateOrderFileData {
  orderId: string;
  filename: string;
  fileUrl: string;
  pageCount: number;
  size: bigint;
  mimeType: string;
}

// Dev in-memory store for orders when database is offline
export const devOrders = new Map<string, any>();

export class OrderRepository {
  async createWithFile(
    orderData: CreateOrderData,
    fileData: Omit<CreateOrderFileData, 'orderId'>,
    eventName: string,
  ): Promise<
    Order & {
      files: Array<{
        id: string;
        filename: string;
        fileUrl: string;
        pageCount: number;
        size: bigint;
        mimeType: string;
      }>;
    }
  > {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderCode: orderData.orderCode,
            userId: orderData.userId ?? null,
            guestSessionId: orderData.guestSessionId ?? null,
            shopId: orderData.shopId,
            totalPages: orderData.totalPages,
            totalPrice: new Prisma.Decimal(orderData.totalPrice),
            copies: orderData.copies,
            color: orderData.color,
            doubleSided: orderData.doubleSided,
            orientation: orderData.orientation,
            paperSize: orderData.paperSize,
          },
        });

        await tx.payment.create({
          data: {
            orderId: order.id,
            method: orderData.paymentMethod as PaymentMethod,
            amount: new Prisma.Decimal(orderData.totalPrice),
            status: 'PENDING',
          },
        });

        const file = await tx.orderFile.create({
          data: {
            orderId: order.id,
            filename: fileData.filename,
            fileUrl: fileData.fileUrl,
            pageCount: fileData.pageCount,
            size: fileData.size,
            mimeType: fileData.mimeType,
          },
        });

        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            event: eventName,
          },
        });

        return {
          ...order,
          files: [
            {
              id: file.id,
              filename: file.filename,
              fileUrl: file.fileUrl,
              pageCount: file.pageCount,
              size: file.size,
              mimeType: file.mimeType,
            },
          ],
        };
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const orderId = crypto.randomUUID();
        const fileId = crypto.randomUUID();
        const now = new Date();

        const order: any = {
          id: orderId,
          orderCode: orderData.orderCode,
          userId: orderData.userId ?? null,
          guestSessionId: orderData.guestSessionId ?? null,
          shopId: orderData.shopId,
          printerId: null,
          queuePosition: null,
          totalPages: orderData.totalPages,
          totalPrice: new Prisma.Decimal(orderData.totalPrice),
          paymentStatus: 'PENDING',
          orderStatus: 'PENDING',
          estimatedTime: null,
          copies: orderData.copies,
          color: orderData.color,
          doubleSided: orderData.doubleSided,
          orientation: orderData.orientation,
          paperSize: orderData.paperSize,
          createdAt: now,
          files: [
            {
              id: fileId,
              orderId,
              filename: fileData.filename,
              fileUrl: fileData.fileUrl,
              pageCount: fileData.pageCount,
              size: fileData.size,
              mimeType: fileData.mimeType,
            },
          ],
          payment: {
            id: crypto.randomUUID(),
            orderId,
            method: orderData.paymentMethod,
            amount: new Prisma.Decimal(orderData.totalPrice),
            status: 'PENDING',
            createdAt: now,
          },
          events: [
            {
              id: crypto.randomUUID(),
              orderId,
              event: eventName,
              createdAt: now,
            },
          ],
          user: {
            id: orderData.userId,
            name: 'Demo Customer',
            email: 'customer@velox.dev',
          },
          shop: {
            id: orderData.shopId,
            name: 'Campus Print Hub',
          },
        };

        devOrders.set(orderId, order);
        return order;
      }
      throw err;
    }
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    try {
      const client = tx || prisma;
      await client.order.update({
        where: { id: orderId },
        data: { orderStatus: status },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const order = devOrders.get(orderId);
        if (order) {
          order.orderStatus = status;
        }
        return;
      }
      throw err;
    }
  }

  async findById(id: string) {
    try {
      return await prisma.order.findUnique({
        where: { id },
        include: {
          files: true,
          user: { select: { id: true, name: true, email: true } },
          shop: { select: { id: true, name: true } },
          payment: true,
          events: { orderBy: { createdAt: 'desc' } },
        },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return devOrders.get(id) || null;
      }
      throw err;
    }
  }

  async findByShopId(
    shopId: string,
    page: number,
    limit: number,
  ): Promise<{ orders: Order[]; total: number }> {
    try {
      const [orders, total] = await prisma.$transaction([
        prisma.order.findMany({
          where: { shopId },
          include: {
            files: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.count({ where: { shopId } }),
      ]);

      return { orders, total };
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const orders = Array.from(devOrders.values()).filter((o) => o.shopId === shopId);
        return {
          orders: orders.slice((page - 1) * limit, page * limit),
          total: orders.length,
        };
      }
      throw err;
    }
  }

  async countTodayByShop(shopId: string): Promise<number> {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return await prisma.order.count({
        where: {
          shopId,
          createdAt: { gte: startOfDay },
        },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return Array.from(devOrders.values()).filter((o) => o.shopId === shopId).length;
      }
      throw err;
    }
  }

  async findTodayByShop(shopId: string): Promise<Order[]> {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return await prisma.order.findMany({
        where: {
          shopId,
          createdAt: { gte: startOfDay },
        },
        include: {
          files: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return Array.from(devOrders.values()).filter((o) => o.shopId === shopId);
      }
      throw err;
    }
  }

  async getActiveCountByShop(shopId: string): Promise<number> {
    try {
      return await prisma.order.count({
        where: {
          shopId,
          orderStatus: {
            in: [
              OrderStatus.PENDING,
              OrderStatus.WAITING,
              OrderStatus.ASSIGNED,
              OrderStatus.DOWNLOADING,
              OrderStatus.PRINTING,
            ],
          },
        },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const active = [
          OrderStatus.PENDING,
          OrderStatus.WAITING,
          OrderStatus.ASSIGNED,
          OrderStatus.DOWNLOADING,
          OrderStatus.PRINTING,
        ];
        return Array.from(devOrders.values()).filter(
          (o) => o.shopId === shopId && active.includes(o.orderStatus),
        ).length;
      }
      throw err;
    }
  }

  async getCompletedCountTodayByShop(shopId: string): Promise<number> {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return await prisma.order.count({
        where: {
          shopId,
          orderStatus: OrderStatus.COMPLETED,
          createdAt: { gte: startOfDay },
        },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return Array.from(devOrders.values()).filter(
          (o) => o.shopId === shopId && o.orderStatus === OrderStatus.COMPLETED,
        ).length;
      }
      throw err;
    }
  }

  async getTodayRevenueByShop(shopId: string): Promise<number> {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const payments = await prisma.payment.findMany({
        where: {
          order: { shopId },
          status: 'SUCCESS',
          createdAt: { gte: startOfDay },
        },
      });

      return payments.reduce((sum, p) => sum + Number(p.amount), 0);
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const orders = Array.from(devOrders.values()).filter((o) => o.shopId === shopId);
        return orders
          .filter((o) => o.payment?.status === 'SUCCESS')
          .reduce((sum, o) => sum + Number(o.payment.amount), 0);
      }
      throw err;
    }
  }

  async findShopOrders(
    shopId: string,
    filters: { status?: string; date?: string; search?: string },
    page: number = 1,
    limit: number = 50,
  ): Promise<{ orders: any[]; total: number }> {
    try {
      const where: any = { shopId };

      if (filters.status && filters.status !== 'All') {
        where.orderStatus = filters.status.toUpperCase();
      }

      if (filters.date) {
        const date = new Date(filters.date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        where.createdAt = { gte: date, lt: nextDay };
      }

      if (filters.search) {
        where.orderCode = { contains: filters.search, mode: 'insensitive' };
      }

      const [orders, total] = await prisma.$transaction([
        prisma.order.findMany({
          where,
          include: {
            files: true,
            user: { select: { id: true, name: true, email: true } },
            payment: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.count({ where }),
      ]);

      return { orders, total };
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        let orders = Array.from(devOrders.values()).filter((o) => o.shopId === shopId);
        if (filters.status && filters.status !== 'All') {
          orders = orders.filter((o) => o.orderStatus === filters.status!.toUpperCase());
        }
        if (filters.search) {
          orders = orders.filter((o) =>
            o.orderCode.toLowerCase().includes(filters.search!.toLowerCase()),
          );
        }
        return { orders: orders.slice((page - 1) * limit, page * limit), total: orders.length };
      }
      throw err;
    }
  }

  async findShopTransactions(
    shopId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ transactions: any[]; total: number }> {
    try {
      const where = { order: { shopId } };

      const [payments, total] = await prisma.$transaction([
        prisma.payment.findMany({
          where,
          include: {
            order: { select: { orderCode: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.payment.count({ where }),
      ]);

      return { transactions: payments, total };
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const orders = Array.from(devOrders.values()).filter(
          (o) => o.shopId === shopId && o.payment,
        );
        const payments = orders.map((o) => ({
          ...o.payment,
          order: { orderCode: o.orderCode },
        }));
        return {
          transactions: payments.slice((page - 1) * limit, page * limit),
          total: payments.length,
        };
      }
      throw err;
    }
  }
}

export const orderRepository = new OrderRepository();
