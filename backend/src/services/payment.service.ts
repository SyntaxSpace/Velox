import { OrderStatus, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { paymentRepository } from '../repositories/payment.repository';
import { logger } from '../config/logger';
import { AppError } from '../utils/app-error';
import { validateTransition, OrderEventType } from './order-state-machine';
import { emitToClientShop } from '../socket';
import { env } from '../config/env';
import { queueService } from './queue.service';
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

  /**
   * Create Razorpay Order in paise for an existing PENDING Velox order.
   */
  async createRazorpayOrder(
    orderId: string,
    userContext?: any,
  ): Promise<{
    orderId: string;
    orderCode: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
  }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw AppError.notFound('Order not found');

    await this.checkOrderAccess(order, userContext);

    if (order.orderStatus !== OrderStatus.PENDING) {
      throw AppError.badRequest(
        `Order is in ${order.orderStatus} status. Cannot initiate payment.`,
      );
    }

    const amountInPaise = Math.round(Number(order.totalPrice) * 100);
    if (amountInPaise <= 0) {
      throw AppError.badRequest('Invalid order amount');
    }

    let razorpayOrderId = '';
    const keyId = env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret && !keyId.startsWith('mock_')) {
      const res = await this.callRazorpayApi('/orders', {
        method: 'POST',
        body: {
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.orderCode,
          notes: {
            orderId: order.id,
            orderCode: order.orderCode,
            shopId: order.shopId,
          },
        },
      });
      razorpayOrderId = res.id;
    } else {
      // Deterministic mock order ID for testing and local development
      razorpayOrderId = `order_test_${crypto.randomBytes(8).toString('hex')}`;
    }

    // Persist razorpayOrderId in transactionId without overwriting later payment id
    if (order.payment) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          transactionId: `rzp_order:${razorpayOrderId}`,
          method: PaymentMethod.UPI,
        },
      });
    }

    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        event: `RAZORPAY_ORDER_CREATED:${razorpayOrderId}`,
      },
    });

    return {
      orderId: order.id,
      orderCode: order.orderCode,
      razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: keyId || 'rzp_test_placeholder',
    };
  }

  /**
   * Verify Razorpay payment signature & payment status, transition order to WAITING,
   * add to queue, emit Socket.IO events, and trigger automatic dispatch if printer ready.
   */
  async verifyRazorpayPayment(
    params: {
      orderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
    userContext?: any,
  ): Promise<{
    orderId: string;
    orderStatus: OrderStatus;
    alreadyConfirmed: boolean;
    dispatched: boolean;
  }> {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw AppError.notFound('Order not found');

    await this.checkOrderAccess(order, userContext);

    // Idempotency check: if order is already paid, return immediately without re-dispatching
    if (
      order.paymentStatus === PaymentStatus.SUCCESS &&
      order.payment?.status === PaymentStatus.SUCCESS &&
      order.orderStatus !== OrderStatus.PENDING
    ) {
      return {
        orderId,
        orderStatus: order.orderStatus,
        alreadyConfirmed: true,
        dispatched: false,
      };
    }

    if (order.orderStatus !== OrderStatus.PENDING) {
      throw AppError.conflict(`Order is in ${order.orderStatus} status. Cannot verify payment.`);
    }

    const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const isMock = !keySecret || (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_ID.startsWith('mock_'));

    // Step 1: Cryptographic signature verification (strictly requires valid HMAC signature)
    if (keySecret) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        logger.warn(
          { orderId, razorpayOrderId, razorpayPaymentId },
          'Invalid Razorpay signature rejected',
        );
        throw AppError.badRequest('Invalid payment signature verification failed');
      }
    } else if (!isMock) {
      throw AppError.internal('Razorpay credentials are not configured on the server');
    }

    // Step 2: Fetch payment from Razorpay API and assert status, amount, currency, order_id
    if (!isMock) {
      const paymentData = await this.callRazorpayApi(`/payments/${razorpayPaymentId}`);
      if (!paymentData || paymentData.status !== 'captured') {
        throw AppError.badRequest(
          `Payment is not captured. Current Razorpay status: ${paymentData?.status || 'unknown'}`,
        );
      }

      const expectedPaise = Math.round(Number(order.totalPrice) * 100);
      if (paymentData.amount !== expectedPaise) {
        throw AppError.badRequest(
          `Payment amount mismatch. Expected: ${expectedPaise}, received: ${paymentData.amount}`,
        );
      }

      if (paymentData.currency !== 'INR') {
        throw AppError.badRequest(
          `Payment currency mismatch. Expected: INR, received: ${paymentData.currency}`,
        );
      }

      if (paymentData.order_id && paymentData.order_id !== razorpayOrderId) {
        throw AppError.badRequest('Razorpay payment does not match the associated Razorpay order');
      }
    }

    // Step 3: Transition and queue order internally
    return this.processConfirmedPaymentInternal({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
    });
  }

  /**
   * Internal dedicated method to atomically transition a confirmed Razorpay payment
   * and order to WAITING, enter the shop queue, and trigger auto-dispatch if eligible.
   */
  private async processConfirmedPaymentInternal(params: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
  }): Promise<{
    orderId: string;
    orderStatus: OrderStatus;
    alreadyConfirmed: boolean;
    dispatched: boolean;
  }> {
    const { orderId, razorpayOrderId, razorpayPaymentId } = params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw AppError.notFound('Order not found');

    if (
      order.paymentStatus === PaymentStatus.SUCCESS &&
      order.payment?.status === PaymentStatus.SUCCESS &&
      order.orderStatus !== OrderStatus.PENDING
    ) {
      return {
        orderId,
        orderStatus: order.orderStatus,
        alreadyConfirmed: true,
        dispatched: false,
      };
    }

    if (order.orderStatus !== OrderStatus.PENDING) {
      throw AppError.conflict(
        `Order is in ${order.orderStatus} status. Cannot process payment confirmation.`,
      );
    }

    const combinedTransactionId = `${razorpayPaymentId}:${razorpayOrderId}`;
    const result = await prisma.$transaction(async (tx) => {
      // Serialize operations on this shop row
      const shops = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM shops WHERE id = ${order.shopId}::uuid FOR UPDATE`,
      );
      if (shops.length === 0) throw AppError.notFound('Shop not found');

      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });
      if (!currentOrder) throw AppError.notFound('Order not found');

      if (
        currentOrder.paymentStatus === PaymentStatus.SUCCESS &&
        currentOrder.orderStatus !== OrderStatus.PENDING
      ) {
        return { orderId, orderStatus: currentOrder.orderStatus, alreadyConfirmed: true };
      }

      if (
        currentOrder.orderStatus !== OrderStatus.PENDING ||
        currentOrder.paymentStatus !== PaymentStatus.PENDING
      ) {
        throw AppError.conflict('Order is no longer awaiting payment');
      }

      validateTransition(OrderStatus.PENDING, OrderStatus.WAITING);

      if (currentOrder.payment) {
        await tx.payment.update({
          where: { id: currentOrder.payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            method: PaymentMethod.UPI,
            transactionId: combinedTransactionId,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: currentOrder.id,
            method: PaymentMethod.UPI,
            amount: currentOrder.totalPrice,
            status: PaymentStatus.SUCCESS,
            transactionId: combinedTransactionId,
          },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          orderStatus: OrderStatus.WAITING,
        },
      });

      await tx.transaction.create({
        data: {
          shopId: currentOrder.shopId,
          orderId,
          amount: currentOrder.totalPrice,
          paymentMethod: PaymentMethod.UPI,
        },
      });

      await tx.orderEvent.createMany({
        data: [
          { orderId, event: OrderEventType.PAYMENT_SUCCESS },
          { orderId, event: OrderEventType.QUEUE_ENTERED },
          { orderId, event: `RAZORPAY_PAYMENT_VERIFIED:${razorpayPaymentId}` },
        ],
      });

      return { orderId, orderStatus: OrderStatus.WAITING, alreadyConfirmed: false };
    });

    if (!result.alreadyConfirmed) {
      emitToClientShop(order.shopId, 'order.status.changed', {
        orderId,
        orderStatus: OrderStatus.WAITING,
        paymentStatus: PaymentStatus.SUCCESS,
      });
      emitToClientShop(order.shopId, 'queue.updated', { shopId: order.shopId, orderId });

      logger.info(
        { orderId, shopId: order.shopId, razorpayPaymentId, razorpayOrderId },
        'Razorpay online payment confirmed successfully — order entered queue',
      );

      // Step 4: Automatically dispatch to printer/Agent if eligible
      const autoDispatchResult = await queueService.autoDispatchNextOrder(order.shopId);
      return {
        orderId,
        orderStatus: autoDispatchResult.dispatched ? OrderStatus.ASSIGNED : OrderStatus.WAITING,
        alreadyConfirmed: false,
        dispatched: autoDispatchResult.dispatched,
      };
    }

    return { ...result, dispatched: false };
  }

  /**
   * Handle Razorpay webhook events idempotently with raw body signature verification.
   */
  async handleRazorpayWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<{ handled: boolean; event: string }> {
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('RAZORPAY_WEBHOOK_SECRET is not configured on the server');
      throw AppError.internal('Webhook secret is not configured on the server');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      logger.warn('Invalid Razorpay webhook signature');
      throw AppError.badRequest('Invalid webhook signature');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      throw AppError.badRequest('Invalid webhook JSON body');
    }

    const event = payload.event;
    logger.info({ event }, 'Received Razorpay webhook event');

    if (event === 'payment.captured') {
      const paymentEntity = payload.payload?.payment?.entity;
      if (!paymentEntity) {
        throw AppError.badRequest(
          'Malformed payment.captured webhook payload: missing payment entity',
        );
      }

      const razorpayPaymentId = paymentEntity.id;
      const razorpayOrderId = paymentEntity.order_id;
      const veloxOrderId = paymentEntity.notes?.orderId;

      if (!veloxOrderId || !razorpayOrderId || !razorpayPaymentId) {
        throw AppError.badRequest('Webhook payment entity missing required IDs');
      }

      if (paymentEntity.status !== 'captured') {
        throw AppError.badRequest(`Payment status is not captured: ${paymentEntity.status}`);
      }

      const order = await prisma.order.findUnique({
        where: { id: veloxOrderId },
        include: { payment: true },
      });
      if (!order) {
        throw AppError.notFound('Velox order not found for captured webhook');
      }

      // Idempotency check: if order is already paid, no-op safely
      if (
        order.paymentStatus === PaymentStatus.SUCCESS &&
        order.payment?.status === PaymentStatus.SUCCESS &&
        order.orderStatus !== OrderStatus.PENDING
      ) {
        logger.info(
          { veloxOrderId },
          'Duplicate payment.captured webhook received for already confirmed order',
        );
        return { handled: true, event };
      }

      if (order.orderStatus !== OrderStatus.PENDING) {
        logger.warn(
          { veloxOrderId, status: order.orderStatus },
          'Cannot process payment.captured for order that is not PENDING',
        );
        return { handled: true, event };
      }

      // Currency check
      if (paymentEntity.currency !== 'INR') {
        throw AppError.badRequest(
          `Payment currency mismatch. Expected: INR, received: ${paymentEntity.currency}`,
        );
      }

      // Amount check
      const expectedPaise = Math.round(Number(order.totalPrice) * 100);
      if (paymentEntity.amount !== expectedPaise) {
        throw AppError.badRequest(
          `Payment amount mismatch. Expected: ${expectedPaise}, received: ${paymentEntity.amount}`,
        );
      }

      // Payment association and stored Razorpay order ID agreement:
      // The webhook cannot confirm an order using untrusted notes.orderId alone;
      // the referenced Velox order, stored Razorpay order ID, amount, and payment association must all agree.
      if (!order.payment || order.payment.transactionId !== `rzp_order:${razorpayOrderId}`) {
        throw AppError.badRequest(
          'Razorpay order ID mismatch or payment not initiated for this order',
        );
      }

      // Process atomic confirmation internally without revalidating Checkout signature
      await this.processConfirmedPaymentInternal({
        orderId: veloxOrderId,
        razorpayOrderId,
        razorpayPaymentId,
      });

      return { handled: true, event };
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity;
      const veloxOrderId = paymentEntity?.notes?.orderId;
      if (veloxOrderId) {
        const order = await prisma.order.findUnique({
          where: { id: veloxOrderId },
          include: { payment: true },
        });

        // Safe out-of-order handling: Never downgrade an already confirmed or non-PENDING order
        if (
          order &&
          order.paymentStatus === PaymentStatus.PENDING &&
          order.orderStatus === OrderStatus.PENDING
        ) {
          if (order.payment && order.payment.status === PaymentStatus.PENDING) {
            await prisma.payment.update({
              where: { id: order.payment.id },
              data: { status: PaymentStatus.FAILED },
            });
          }
          await prisma.orderEvent.create({
            data: {
              orderId: veloxOrderId,
              event: 'RAZORPAY_PAYMENT_FAILED',
            },
          });
          logger.info({ veloxOrderId }, 'Marked payment as FAILED from webhook event');
        } else {
          logger.info(
            {
              veloxOrderId,
              orderStatus: order?.orderStatus,
              paymentStatus: order?.paymentStatus,
            },
            'Safely ignored late payment.failed webhook event for confirmed or non-pending order',
          );
        }
      }
      return { handled: true, event };
    }

    return { handled: true, event };
  }

  private async checkOrderAccess(order: any, userContext?: any): Promise<void> {
    if (!userContext) return;
    if (userContext.role === 'ADMIN') return;
    if (userContext.role === 'OPERATOR' && userContext.shopId === order.shopId) return;
    if (userContext.role === 'OWNER' || userContext.role === 'SHOP_OWNER') {
      const shop = await prisma.shop.findUnique({ where: { id: order.shopId } });
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
    if (userContext.userId && order.userId === userContext.userId) return;
    throw AppError.forbidden('Access denied: You do not have permission to access this order');
  }

  private async callRazorpayApi(endpoint: string, options: { method?: string; body?: any } = {}) {
    const keyId = env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw AppError.internal('Razorpay credentials are not configured on the server');
    }

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      const errorMsg = data?.error?.description || `Razorpay error (HTTP ${res.status})`;
      logger.error({ status: res.status, endpoint, errorMsg }, 'Razorpay API call failed');
      throw AppError.badRequest(errorMsg);
    }
    return data;
  }
}

export const paymentService = new PaymentService();
