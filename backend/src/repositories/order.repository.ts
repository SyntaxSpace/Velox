import { Order, OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';

export interface CreateOrderData {
  orderCode: string;
  userId: string;
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
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderCode: orderData.orderCode,
          userId: orderData.userId,
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
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || prisma;
    await client.order.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });
  }

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        files: true,
        user: { select: { id: true, name: true, email: true } },
        shop: { select: { id: true, name: true } },
        payment: true,
        events: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async findByShopId(
    shopId: string,
    page: number,
    limit: number,
  ): Promise<{ orders: Order[]; total: number }> {
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
  }

  async countTodayByShop(shopId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return prisma.order.count({
      where: {
        shopId,
        createdAt: { gte: startOfDay },
      },
    });
  }

  async findTodayByShop(shopId: string): Promise<Order[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return prisma.order.findMany({
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
  }

  async getActiveCountByShop(shopId: string): Promise<number> {
    return prisma.order.count({
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
  }
}

export const orderRepository = new OrderRepository();
