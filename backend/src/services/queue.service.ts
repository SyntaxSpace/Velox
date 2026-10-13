import { OrderStatus, PaymentStatus, Prisma, PrinterStatus, PrinterType } from '@prisma/client';
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
  async transitionOrder(
    orderId: string,
    newStatus: OrderStatus,
    expectedShopId?: string,
  ): Promise<void> {
    let eventShopId: string | undefined;
    let previousStatus: OrderStatus | undefined;
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) {
          throw AppError.notFound('Order not found');
        }
        if (expectedShopId && order.shopId !== expectedShopId) {
          throw AppError.forbidden('Agent cannot update an order from another shop');
        }

        const currentStatus = order.orderStatus as OrderStatus;
        validateTransition(currentStatus, newStatus);

        const eventType = getEventForTransition(currentStatus, newStatus);

        const updated = await tx.order.updateMany({
          where: { id: orderId, shopId: order.shopId, orderStatus: currentStatus },
          data: { orderStatus: newStatus },
        });
        if (updated.count !== 1) {
          throw AppError.conflict('Order state changed before this update was applied');
        }

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
        eventShopId = order.shopId;
        previousStatus = currentStatus;
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const { devOrders } = await import('../repositories/order.repository');
        const order = devOrders.get(orderId);
        if (!order) {
          throw AppError.notFound('Order not found');
        }
        if (expectedShopId && order.shopId !== expectedShopId) {
          throw AppError.forbidden('Agent cannot update an order from another shop');
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

    if (eventShopId) {
      const { emitToClientShop } = await import('../socket');
      emitToClientShop(eventShopId, 'order.status.changed', {
        orderId,
        orderStatus: newStatus,
        previousStatus,
      });
      emitToClientShop(eventShopId, 'queue.updated', { shopId: eventShopId, orderId });
    }
  }

  /**
   * Assign an order to a printer and dispatch to the Windows Agent.
   */
  async dispatchNextOrder(
    orderId: string,
    shopId: string,
    ownerId: string,
    preferredPrinter?: string,
  ) {
    const { agentService } = await import('./agent.service');
    const { emitToAgentDevice, emitToClientShop, isAgentConnected } = await import('../socket');
    const ownerShop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true, status: true },
    });
    if (!ownerShop) throw AppError.notFound('Shop not found');
    if (ownerShop.ownerId !== ownerId) throw AppError.forbidden('You do not own this shop');
    if (ownerShop.status !== 'ACTIVE') throw AppError.conflict('This shop is not active');

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { files: true },
    });
    if (!existingOrder) throw AppError.notFound('Order not found');
    if (existingOrder.shopId !== shopId) {
      throw AppError.forbidden('This order does not belong to your shop');
    }
    if (existingOrder.orderStatus !== OrderStatus.WAITING) {
      throw AppError.conflict('Only paid orders waiting in the queue can be dispatched');
    }
    if (existingOrder.paymentStatus !== PaymentStatus.SUCCESS) {
      throw AppError.conflict('Payment must be confirmed before dispatch');
    }
    if (
      existingOrder.color.toLowerCase() !== 'bw' ||
      existingOrder.paperSize.toUpperCase() !== 'A4'
    ) {
      throw AppError.badRequest('The connected printer supports B&W A4 jobs only');
    }

    const fileInfo = await agentService.getAuthorizedOrderFile(orderId, shopId);
    const heartbeatCutoff = new Date(Date.now() - 90_000);
    const connectedDevice = await prisma.device.findFirst({
      where: {
        shopId,
        status: 'ONLINE',
        lastHeartbeat: { gte: heartbeatCutoff },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, deviceId: true },
    });
    if (!connectedDevice || !(await isAgentConnected(connectedDevice.deviceId))) {
      throw AppError.conflict('The shop Agent is disconnected; reconnect it before dispatching');
    }

    let printerName = '';

    await prisma.$transaction(async (tx) => {
      // The shop row serializes payment/dispatch operations and preserves FIFO under concurrent clicks.
      const shops = await tx.$queryRaw<
        Array<{ id: string; ownerId: string | null; status: string }>
      >(
        Prisma.sql`SELECT id, owner_id AS "ownerId", status FROM shops WHERE id = ${shopId}::uuid FOR UPDATE`,
      );
      const shop = shops[0];
      if (!shop) throw AppError.notFound('Shop not found');
      if (shop.ownerId !== ownerId) throw AppError.forbidden('You do not own this shop');
      if (shop.status !== 'ACTIVE') throw AppError.conflict('This shop is not active');

      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.shopId !== shopId) throw AppError.notFound('Order not found');
      if (
        order.orderStatus !== OrderStatus.WAITING ||
        order.paymentStatus !== PaymentStatus.SUCCESS
      ) {
        throw AppError.conflict('Only paid orders waiting in the queue can be dispatched');
      }

      const firstWaitingOrder = await tx.order.findFirst({
        where: {
          shopId,
          orderStatus: OrderStatus.WAITING,
          paymentStatus: PaymentStatus.SUCCESS,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });
      if (firstWaitingOrder?.id !== orderId) {
        throw AppError.conflict('Dispatch the oldest paid order in the queue first');
      }

      const activeOrder = await tx.order.findFirst({
        where: {
          shopId,
          orderStatus: {
            in: [OrderStatus.ASSIGNED, OrderStatus.DOWNLOADING, OrderStatus.PRINTING],
          },
        },
        select: { id: true },
      });
      if (activeOrder) {
        throw AppError.conflict(
          'Wait for the current print job to finish before dispatching another',
        );
      }

      const device = await tx.device.findFirst({
        where: {
          shopId,
          status: 'ONLINE',
          lastHeartbeat: { gte: heartbeatCutoff },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, deviceId: true },
      });
      if (!device)
        throw AppError.conflict('The shop Agent is offline; reconnect it before dispatching');
      if (device.id !== connectedDevice.id) {
        throw AppError.conflict('The connected shop Agent changed; retry dispatch');
      }

      let printer = null;
      if (preferredPrinter) {
        printer = await tx.printer.findFirst({
          where: {
            shopId,
            status: PrinterStatus.ONLINE,
            printerType: PrinterType.BLACK_WHITE,
            OR: [{ id: preferredPrinter }, { name: preferredPrinter }],
          },
          select: { id: true, name: true },
        });
      }

      if (!printer) {
        printer = await tx.printer.findFirst({
          where: {
            shopId,
            status: PrinterStatus.ONLINE,
            printerType: PrinterType.BLACK_WHITE,
            name: { contains: '1018' },
          },
          select: { id: true, name: true },
        });
      }

      if (!printer) {
        printer = await tx.printer.findFirst({
          where: {
            shopId,
            status: PrinterStatus.ONLINE,
            printerType: PrinterType.BLACK_WHITE,
            name: {
              notIn: [
                'Fax',
                'Microsoft Print to PDF',
                'Microsoft XPS Document Writer',
                'Send To OneNote 2016',
                'OneNote (Desktop)',
                'OneNote (Desktop) - Protected',
              ],
            },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, name: true },
        });
      }

      if (!printer) {
        throw AppError.conflict('No online B&W printer is registered for this shop');
      }

      const changed = await tx.order.updateMany({
        where: {
          id: orderId,
          shopId,
          orderStatus: OrderStatus.WAITING,
          paymentStatus: PaymentStatus.SUCCESS,
        },
        data: { orderStatus: OrderStatus.ASSIGNED, printerId: printer.id },
      });
      if (changed.count !== 1) throw AppError.conflict('This order was already dispatched');

      await tx.orderEvent.create({
        data: { orderId, event: OrderEventType.ORDER_ASSIGNED },
      });
      printerName = printer.name;
    });

    const payload = {
      orderId: existingOrder.id,
      orderCode: existingOrder.orderCode,
      shopId,
      printerName,
      downloadUrl: `/api/v1/agent/orders/${existingOrder.id}/file`,
      expectedChecksum: fileInfo.checksum,
      fileSize: fileInfo.size,
      copies: existingOrder.copies,
      color: existingOrder.color,
      doubleSided: existingOrder.doubleSided,
      orientation: existingOrder.orientation,
      paperSize: existingOrder.paperSize,
    };

    emitToAgentDevice(connectedDevice.deviceId, 'job.assigned', payload);
    emitToClientShop(shopId, 'order.assigned', { orderId, printerName });
    emitToClientShop(shopId, 'order.status.changed', {
      orderId,
      orderStatus: OrderStatus.ASSIGNED,
      paymentStatus: PaymentStatus.SUCCESS,
    });
    emitToClientShop(shopId, 'queue.updated', { shopId, orderId });

    logger.info({ orderId, shopId, ownerId, printerName }, 'Paid order dispatched to shop Agent');
    return {
      orderId,
      orderCode: existingOrder.orderCode,
      printerName,
      orderStatus: OrderStatus.ASSIGNED,
    };
  }

  /**
   * Automatically dispatch the oldest eligible waiting paid order for a shop
   * if the agent and printer are ready and no job is currently in progress.
   */
  async autoDispatchNextOrder(
    shopId: string,
  ): Promise<{ dispatched: boolean; orderId?: string; printerName?: string; reason?: string }> {
    try {
      const { agentService } = await import('./agent.service');
      const { emitToAgentDevice, emitToClientShop, isAgentConnected } = await import('../socket');

      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { id: true, status: true },
      });
      if (!shop || shop.status !== 'ACTIVE') {
        return { dispatched: false, reason: 'SHOP_INACTIVE' };
      }

      // Find the oldest waiting paid order
      const oldestWaiting = await prisma.order.findFirst({
        where: {
          shopId,
          orderStatus: OrderStatus.WAITING,
          paymentStatus: PaymentStatus.SUCCESS,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { files: true },
      });
      if (!oldestWaiting) {
        return { dispatched: false, reason: 'NO_WAITING_ORDER' };
      }

      // Check if another order is already active
      const activeOrder = await prisma.order.findFirst({
        where: {
          shopId,
          orderStatus: {
            in: [OrderStatus.ASSIGNED, OrderStatus.DOWNLOADING, OrderStatus.PRINTING],
          },
        },
        select: { id: true },
      });
      if (activeOrder) {
        return { dispatched: false, reason: 'JOB_ALREADY_ACTIVE' };
      }

      // Check supported print specifications (B&W A4)
      if (
        oldestWaiting.color.toLowerCase() !== 'bw' ||
        oldestWaiting.paperSize.toUpperCase() !== 'A4'
      ) {
        return { dispatched: false, reason: 'UNSUPPORTED_PRINT_SPECS' };
      }

      // Check agent device connectivity
      const heartbeatCutoff = new Date(Date.now() - 90_000);
      const connectedDevice = await prisma.device.findFirst({
        where: {
          shopId,
          status: 'ONLINE',
          lastHeartbeat: { gte: heartbeatCutoff },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, deviceId: true },
      });
      if (!connectedDevice || !(await isAgentConnected(connectedDevice.deviceId))) {
        return { dispatched: false, reason: 'AGENT_OFFLINE' };
      }

      const fileInfo = await agentService.getAuthorizedOrderFile(oldestWaiting.id, shopId);
      let printerName = '';

      await prisma.$transaction(async (tx) => {
        const shops = await tx.$queryRaw<Array<{ id: string; status: string }>>(
          Prisma.sql`SELECT id, status FROM shops WHERE id = ${shopId}::uuid FOR UPDATE`,
        );
        if (!shops[0] || shops[0].status !== 'ACTIVE') {
          throw new Error('Shop not active');
        }

        const currentlyActive = await tx.order.findFirst({
          where: {
            shopId,
            orderStatus: {
              in: [OrderStatus.ASSIGNED, OrderStatus.DOWNLOADING, OrderStatus.PRINTING],
            },
          },
          select: { id: true },
        });
        if (currentlyActive) throw new Error('Active job in progress');

        const firstWaiting = await tx.order.findFirst({
          where: {
            shopId,
            orderStatus: OrderStatus.WAITING,
            paymentStatus: PaymentStatus.SUCCESS,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true },
        });
        if (firstWaiting?.id !== oldestWaiting.id) {
          throw new Error('Order is no longer oldest waiting order');
        }

        let printer = await tx.printer.findFirst({
          where: {
            shopId,
            status: PrinterStatus.ONLINE,
            printerType: PrinterType.BLACK_WHITE,
            name: { contains: '1018' },
          },
          select: { id: true, name: true },
        });

        if (!printer) {
          printer = await tx.printer.findFirst({
            where: {
              shopId,
              status: PrinterStatus.ONLINE,
              printerType: PrinterType.BLACK_WHITE,
              name: {
                notIn: [
                  'Fax',
                  'Microsoft Print to PDF',
                  'Microsoft XPS Document Writer',
                  'Send To OneNote 2016',
                  'OneNote (Desktop)',
                  'OneNote (Desktop) - Protected',
                ],
              },
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: { id: true, name: true },
          });
        }

        if (!printer) {
          throw new Error('No online printer available');
        }

        const updated = await tx.order.updateMany({
          where: {
            id: oldestWaiting.id,
            shopId,
            orderStatus: OrderStatus.WAITING,
            paymentStatus: PaymentStatus.SUCCESS,
          },
          data: { orderStatus: OrderStatus.ASSIGNED, printerId: printer.id },
        });
        if (updated.count !== 1) throw new Error('Order already transitioned');

        await tx.orderEvent.create({
          data: { orderId: oldestWaiting.id, event: OrderEventType.ORDER_ASSIGNED },
        });

        printerName = printer.name;
      });

      const payload = {
        orderId: oldestWaiting.id,
        orderCode: oldestWaiting.orderCode,
        shopId,
        printerName,
        downloadUrl: `/api/v1/agent/orders/${oldestWaiting.id}/file`,
        expectedChecksum: fileInfo.checksum,
        fileSize: fileInfo.size,
        copies: oldestWaiting.copies,
        color: oldestWaiting.color,
        doubleSided: oldestWaiting.doubleSided,
        orientation: oldestWaiting.orientation,
        paperSize: oldestWaiting.paperSize,
      };

      emitToAgentDevice(connectedDevice.deviceId, 'job.assigned', payload);
      emitToClientShop(shopId, 'order.assigned', { orderId: oldestWaiting.id, printerName });
      emitToClientShop(shopId, 'order.status.changed', {
        orderId: oldestWaiting.id,
        orderStatus: OrderStatus.ASSIGNED,
        paymentStatus: PaymentStatus.SUCCESS,
      });
      emitToClientShop(shopId, 'queue.updated', { shopId, orderId: oldestWaiting.id });

      logger.info(
        { orderId: oldestWaiting.id, shopId, printerName },
        'Auto-dispatched paid order to shop Agent',
      );

      return { dispatched: true, orderId: oldestWaiting.id, printerName };
    } catch (err: any) {
      logger.info({ shopId, message: err.message }, 'Auto-dispatch condition not met or skipped');
      return { dispatched: false, reason: err.message };
    }
  }

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
      // Pick first available online printer, preferring connected HP 1018 over virtual/disconnected devices
      const defaultPrinter =
        shopPrinters.find((p) => p.status === 'ONLINE' && p.name.includes('1018')) ||
        shopPrinters.find(
          (p) =>
            p.status === 'ONLINE' &&
            !p.name.includes('OneNote') &&
            !p.name.includes('PDF') &&
            !p.name.includes('Fax'),
        ) ||
        shopPrinters.find((p) => p.status === 'ONLINE') ||
        shopPrinters[0];
      selectedPrinterName = defaultPrinter ? defaultPrinter.name : 'HP LaserJet 1018';
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
