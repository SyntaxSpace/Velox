import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '../src/database/prisma';
import { PaymentService } from '../src/services/payment.service';
import { QueueService } from '../src/services/queue.service';
import { emitToAgentDevice, emitToClientShop, isAgentConnected } from '../src/socket';
import crypto from 'crypto';

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    shop: { findUnique: vi.fn() },
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    transaction: { create: vi.fn() },
    orderEvent: { create: vi.fn(), createMany: vi.fn() },
    device: { findFirst: vi.fn() },
    printer: { findFirst: vi.fn() },
  };

  return {
    tx,
    db: {
      $transaction: vi.fn(),
      order: { findUnique: vi.fn(), findFirst: vi.fn() },
      shop: { findUnique: vi.fn() },
      payment: { update: vi.fn() },
      orderEvent: { create: vi.fn() },
      device: { findFirst: vi.fn() },
      printer: { findFirst: vi.fn() },
    },
    getAuthorizedOrderFile: vi.fn(),
    emitToAgentDevice: vi.fn(),
    emitToClientShop: vi.fn(),
    isAgentConnected: vi.fn(),
  };
});

vi.mock('../src/database/prisma', () => ({ prisma: mocks.db }));
vi.mock('../src/services/agent.service', () => ({
  agentService: { getAuthorizedOrderFile: mocks.getAuthorizedOrderFile },
}));
vi.mock('../src/socket', () => ({
  emitToAgentDevice: mocks.emitToAgentDevice,
  emitToClientShop: mocks.emitToClientShop,
  isAgentConnected: mocks.isAgentConnected,
}));
vi.mock('../src/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const SHOP_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '33333333-3333-4333-8333-333333333333';
const ORDER_ID = '44444444-4444-4444-8444-444444444444';
const PRINTER_ID = '55555555-5555-4555-8555-555555555555';
const TEST_SECRET = 'rzp_test_secret_for_unit_tests_123456';
const TEST_WEBHOOK_SECRET = 'rzp_test_webhook_secret_for_unit_tests_789012';

function setTransactionMock() {
  (prisma.$transaction as any).mockImplementation((operation: (tx: typeof mocks.tx) => unknown) =>
    operation(mocks.tx),
  );
}

function createTestOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    orderCode: 'VLX-ONL999',
    shopId: SHOP_ID,
    orderStatus: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    totalPages: 2,
    totalPrice: '4.00',
    copies: 1,
    color: 'bw',
    doubleSided: false,
    orientation: 'portrait',
    paperSize: 'A4',
    files: [{ id: 'file-1' }],
    payment: {
      id: 'payment-online-id',
      method: PaymentMethod.UPI,
      amount: '4.00',
      status: PaymentStatus.PENDING,
      transactionId: null,
    },
    ...overrides,
  };
}

function createWebhookPayload(event: string, paymentOverrides: Record<string, unknown> = {}) {
  const payload = {
    entity: 'event',
    account_id: 'acc_test123',
    event,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: 'pay_test_rzp98765',
          entity: 'payment',
          amount: 400,
          currency: 'INR',
          status: event === 'payment.captured' ? 'captured' : 'failed',
          order_id: 'order_test_rzp12345',
          notes: {
            orderId: ORDER_ID,
            orderCode: 'VLX-ONL999',
            shopId: SHOP_ID,
          },
          ...paymentOverrides,
        },
      },
    },
    created_at: 1700000000,
  };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', TEST_WEBHOOK_SECRET).update(rawBody).digest('hex');

  return { payload, rawBody, signature };
}

describe('Razorpay Test Mode Integration', () => {
  let paymentService: PaymentService;
  let queueService: QueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    setTransactionMock();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key_12345';
    process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    paymentService = new PaymentService();
    queueService = new QueueService();

    // Default DB mock state
    (prisma.shop.findUnique as any).mockResolvedValue({
      id: SHOP_ID,
      ownerId: OWNER_ID,
      status: 'ACTIVE',
    });
    (prisma.payment.update as any).mockResolvedValue({ id: 'payment-online-id' });
    (prisma.orderEvent.create as any).mockResolvedValue({ id: 'event-id' });
    mocks.tx.$queryRaw.mockResolvedValue([{ id: SHOP_ID, status: 'ACTIVE' }]);
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.order.update.mockResolvedValue({ count: 1 });
    mocks.tx.payment.update.mockResolvedValue({ id: 'payment-online-id' });
    mocks.tx.transaction.create.mockResolvedValue({ id: 'trans-id' });
    mocks.tx.orderEvent.createMany.mockResolvedValue({ count: 3 });
    mocks.tx.orderEvent.create.mockResolvedValue({ id: 'event-id' });
    mocks.getAuthorizedOrderFile.mockResolvedValue({ checksum: 'b'.repeat(64), size: 256 });
  });

  describe('Order Creation & Razorpay Order Generation', () => {
    it('creates a Razorpay order in paise and stores rzp_order identifier without overwriting payment id', async () => {
      const order = createTestOrder();
      (prisma.order.findUnique as any).mockResolvedValue(order);

      // Mock internal callRazorpayApi or mock order generation
      const mockCall = vi.spyOn(paymentService as any, 'callRazorpayApi').mockResolvedValue({
        id: 'order_test_rzp12345',
        amount: 400,
        currency: 'INR',
      });

      const result = await paymentService.createRazorpayOrder(ORDER_ID);

      expect(result.orderId).toBe(ORDER_ID);
      expect(result.amount).toBe(400); // 4.00 INR = 400 paise
      expect(result.currency).toBe('INR');
      expect(result.razorpayOrderId).toBe('order_test_rzp12345');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-online-id' },
        data: expect.objectContaining({
          transactionId: 'rzp_order:order_test_rzp12345',
          method: PaymentMethod.UPI,
        }),
      });

      expect(prisma.orderEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: ORDER_ID,
          event: 'RAZORPAY_ORDER_CREATED:order_test_rzp12345',
        }),
      });
      mockCall.mockRestore();
    });

    it('rejects order creation if order is not in PENDING status', async () => {
      const order = createTestOrder({ orderStatus: OrderStatus.WAITING });
      (prisma.order.findUnique as any).mockResolvedValue(order);

      await expect(paymentService.createRazorpayOrder(ORDER_ID)).rejects.toThrow(
        /Cannot initiate payment/,
      );
    });
  });

  describe('Signature Verification & Payment Confirmation', () => {
    const razorpayOrderId = 'order_test_rzp12345';
    const razorpayPaymentId = 'pay_test_rzp98765';

    function getValidSignature(orderId = razorpayOrderId, paymentId = razorpayPaymentId) {
      return crypto
        .createHmac('sha256', TEST_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    }

    it('rejects invalid signature without releasing order to queue', async () => {
      const order = createTestOrder();
      (prisma.order.findUnique as any).mockResolvedValue(order);

      await expect(
        paymentService.verifyRazorpayPayment({
          orderId: ORDER_ID,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: 'invalid_forged_signature_hex_0000',
        }),
      ).rejects.toThrow(/signature/i);

      expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
      expect(emitToClientShop).not.toHaveBeenCalled();
    });

    it('strictly rejects forged "webhook_verified" string on public checkout verification endpoint', async () => {
      const order = createTestOrder();
      (prisma.order.findUnique as any).mockResolvedValue(order);

      await expect(
        paymentService.verifyRazorpayPayment({
          orderId: ORDER_ID,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: 'webhook_verified',
        }),
      ).rejects.toThrow(/signature verification failed/i);

      expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
      expect(mocks.tx.order.update).not.toHaveBeenCalled();
      expect(emitToClientShop).not.toHaveBeenCalled();
    });

    it('rejects payment when Razorpay reports amount mismatch', async () => {
      const order = createTestOrder({ totalPrice: '4.00' }); // expects 400 paise
      (prisma.order.findUnique as any).mockResolvedValue(order);

      const validSig = getValidSignature();
      const mockCall = vi.spyOn(paymentService as any, 'callRazorpayApi').mockResolvedValue({
        id: razorpayPaymentId,
        status: 'captured',
        amount: 300, // mismatch!
        currency: 'INR',
        order_id: razorpayOrderId,
      });

      await expect(
        paymentService.verifyRazorpayPayment({
          orderId: ORDER_ID,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSig,
        }),
      ).rejects.toThrow(/amount mismatch/i);

      expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
      mockCall.mockRestore();
    });

    it('rejects payment when status is not captured', async () => {
      const order = createTestOrder();
      (prisma.order.findUnique as any).mockResolvedValue(order);

      const validSig = getValidSignature();
      const mockCall = vi.spyOn(paymentService as any, 'callRazorpayApi').mockResolvedValue({
        id: razorpayPaymentId,
        status: 'failed',
        amount: 400,
        currency: 'INR',
        order_id: razorpayOrderId,
      });

      await expect(
        paymentService.verifyRazorpayPayment({
          orderId: ORDER_ID,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSig,
        }),
      ).rejects.toThrow(/not captured/i);

      expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
      mockCall.mockRestore();
    });

    it('successfully confirms payment, records combined recoverable transactionId, and adds order to queue', async () => {
      const order = createTestOrder();
      (prisma.order.findUnique as any).mockResolvedValue(order);
      mocks.tx.order.findUnique.mockResolvedValue(order);

      const validSig = getValidSignature();
      const mockCall = vi.spyOn(paymentService as any, 'callRazorpayApi').mockResolvedValue({
        id: razorpayPaymentId,
        status: 'captured',
        amount: 400,
        currency: 'INR',
        order_id: razorpayOrderId,
      });

      const result = await paymentService.verifyRazorpayPayment({
        orderId: ORDER_ID,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSig,
      });

      expect(result.alreadyConfirmed).toBe(false);
      expect(result.orderId).toBe(ORDER_ID);

      // Verify payment updated to SUCCESS and transactionId has both IDs in unambiguous format
      expect(mocks.tx.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-online-id' },
        data: {
          status: PaymentStatus.SUCCESS,
          method: PaymentMethod.UPI,
          transactionId: `${razorpayPaymentId}:${razorpayOrderId}`,
        },
      });

      // Verify order updated to WAITING
      expect(mocks.tx.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          orderStatus: OrderStatus.WAITING,
        },
      });

      // Verify ledger transaction recorded
      expect(mocks.tx.transaction.create).toHaveBeenCalledWith({
        data: {
          shopId: SHOP_ID,
          orderId: ORDER_ID,
          amount: '4.00',
          paymentMethod: PaymentMethod.UPI,
        },
      });

      // Verify events emitted to client shop
      expect(emitToClientShop).toHaveBeenCalledWith(SHOP_ID, 'order.status.changed', {
        orderId: ORDER_ID,
        orderStatus: OrderStatus.WAITING,
        paymentStatus: PaymentStatus.SUCCESS,
      });
      expect(emitToClientShop).toHaveBeenCalledWith(SHOP_ID, 'queue.updated', {
        shopId: SHOP_ID,
        orderId: ORDER_ID,
      });

      mockCall.mockRestore();
    });

    it('is strictly idempotent on duplicate payment verification or callback without duplicating transactions', async () => {
      const alreadyPaidOrder = createTestOrder({
        orderStatus: OrderStatus.WAITING,
        paymentStatus: PaymentStatus.SUCCESS,
        payment: {
          id: 'payment-online-id',
          method: PaymentMethod.UPI,
          amount: '4.00',
          status: PaymentStatus.SUCCESS,
          transactionId: `${razorpayPaymentId}:${razorpayOrderId}`,
        },
      });
      (prisma.order.findUnique as any).mockResolvedValue(alreadyPaidOrder);

      const validSig = getValidSignature();
      const result = await paymentService.verifyRazorpayPayment({
        orderId: ORDER_ID,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSig,
      });

      expect(result.alreadyConfirmed).toBe(true);
      expect(result.orderStatus).toBe(OrderStatus.WAITING);
      expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
      expect(emitToClientShop).not.toHaveBeenCalled();
    });
  });

  describe('Webhook Signature & Event Handling (Trusted Webhook Flow)', () => {
    const razorpayOrderId = 'order_test_rzp12345';
    const razorpayPaymentId = 'pay_test_rzp98765';

    it('valid raw-body webhook signature verifies and transitions payment.captured to WAITING and auto-dispatches', async () => {
      const order = createTestOrder({
        payment: {
          id: 'payment-online-id',
          method: PaymentMethod.UPI,
          amount: '4.00',
          status: PaymentStatus.PENDING,
          transactionId: `rzp_order:${razorpayOrderId}`,
        },
      });
      (prisma.order.findUnique as any).mockResolvedValue(order);
      mocks.tx.order.findUnique.mockResolvedValue(order);

      // Auto-dispatch queries
      const paidWaitingOrder = {
        ...order,
        orderStatus: OrderStatus.WAITING,
        paymentStatus: PaymentStatus.SUCCESS,
      };
      (prisma.order.findFirst as any)
        .mockResolvedValueOnce(paidWaitingOrder)
        .mockResolvedValueOnce(null);

      (prisma.device.findFirst as any).mockResolvedValue({
        id: 'device-01',
        deviceId: 'agent-pc-1',
      });
      mocks.isAgentConnected.mockResolvedValue(true);

      mocks.tx.order.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(paidWaitingOrder);
      mocks.tx.printer.findFirst.mockResolvedValue({ id: PRINTER_ID, name: 'HP LaserJet 1018' });

      const { rawBody, signature } = createWebhookPayload('payment.captured');
      const result = await paymentService.handleRazorpayWebhook(rawBody, signature);

      expect(result.handled).toBe(true);
      expect(result.event).toBe('payment.captured');

      expect(mocks.tx.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-online-id' },
        data: {
          status: PaymentStatus.SUCCESS,
          method: PaymentMethod.UPI,
          transactionId: `${razorpayPaymentId}:${razorpayOrderId}`,
        },
      });

      expect(mocks.tx.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          orderStatus: OrderStatus.WAITING,
        },
      });

      expect(emitToAgentDevice).toHaveBeenCalledWith(
        'agent-pc-1',
        'job.assigned',
        expect.objectContaining({ orderId: ORDER_ID }),
      );
    });

    it('invalid webhook signature rejects without mutating order status or creating transaction', async () => {
      const order = createTestOrder();
      (prisma.order.findUnique as any).mockResolvedValue(order);

      const { rawBody } = createWebhookPayload('payment.captured');
      const forgedSignature = 'forged_invalid_webhook_signature_000000';

      await expect(paymentService.handleRazorpayWebhook(rawBody, forgedSignature)).rejects.toThrow(
        /Invalid webhook signature/i,
      );

      expect(mocks.tx.order.update).not.toHaveBeenCalled();
      expect(mocks.tx.payment.update).not.toHaveBeenCalled();
      expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
    });

    it('handles duplicate payment.captured webhook events idempotently without double-charging or re-dispatching', async () => {
      const alreadyPaidOrder = createTestOrder({
        orderStatus: OrderStatus.WAITING,
        paymentStatus: PaymentStatus.SUCCESS,
        payment: {
          id: 'payment-online-id',
          method: PaymentMethod.UPI,
          amount: '4.00',
          status: PaymentStatus.SUCCESS,
          transactionId: `${razorpayPaymentId}:${razorpayOrderId}`,
        },
      });
      (prisma.order.findUnique as any).mockResolvedValue(alreadyPaidOrder);

      const { rawBody, signature } = createWebhookPayload('payment.captured');
      const result = await paymentService.handleRazorpayWebhook(rawBody, signature);

      expect(result.handled).toBe(true);
      expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
      expect(emitToAgentDevice).not.toHaveBeenCalled();
    });

    it('safely ignores out-of-order payment.failed webhook event and never downgrades a confirmed payment', async () => {
      const confirmedOrder = createTestOrder({
        orderStatus: OrderStatus.WAITING,
        paymentStatus: PaymentStatus.SUCCESS,
        payment: {
          id: 'payment-online-id',
          method: PaymentMethod.UPI,
          amount: '4.00',
          status: PaymentStatus.SUCCESS,
          transactionId: `${razorpayPaymentId}:${razorpayOrderId}`,
        },
      });
      (prisma.order.findUnique as any).mockResolvedValue(confirmedOrder);

      const { rawBody, signature } = createWebhookPayload('payment.failed');
      const result = await paymentService.handleRazorpayWebhook(rawBody, signature);

      expect(result.handled).toBe(true);
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(mocks.tx.payment.update).not.toHaveBeenCalled();
    });

    it('rejects webhook payment when currency is not INR without mutating order', async () => {
      const order = createTestOrder({
        payment: {
          id: 'payment-online-id',
          method: PaymentMethod.UPI,
          amount: '4.00',
          status: PaymentStatus.PENDING,
          transactionId: `rzp_order:${razorpayOrderId}`,
        },
      });
      (prisma.order.findUnique as any).mockResolvedValue(order);

      const { rawBody, signature } = createWebhookPayload('payment.captured', { currency: 'USD' });

      await expect(paymentService.handleRazorpayWebhook(rawBody, signature)).rejects.toThrow(
        /currency mismatch/i,
      );
      expect(mocks.tx.order.update).not.toHaveBeenCalled();
    });

    it('rejects webhook payment when amount mismatches expected total without mutating order', async () => {
      const order = createTestOrder({
        totalPrice: '4.00',
        payment: {
          id: 'payment-online-id',
          method: PaymentMethod.UPI,
          amount: '4.00',
          status: PaymentStatus.PENDING,
          transactionId: `rzp_order:${razorpayOrderId}`,
        },
      });
      (prisma.order.findUnique as any).mockResolvedValue(order);

      const { rawBody, signature } = createWebhookPayload('payment.captured', { amount: 200 }); // 200 paise

      await expect(paymentService.handleRazorpayWebhook(rawBody, signature)).rejects.toThrow(
        /amount mismatch/i,
      );
      expect(mocks.tx.order.update).not.toHaveBeenCalled();
    });

    it('rejects webhook payment when razorpay order ID does not match stored order', async () => {
      const orderWithStoredRzp = createTestOrder({
        payment: {
          id: 'payment-online-id',
          method: PaymentMethod.UPI,
          amount: '4.00',
          status: PaymentStatus.PENDING,
          transactionId: 'rzp_order:order_test_rzp12345',
        },
      });
      (prisma.order.findUnique as any).mockResolvedValue(orderWithStoredRzp);

      const { rawBody, signature } = createWebhookPayload('payment.captured', {
        order_id: 'order_mismatched_different_9999',
      });

      await expect(paymentService.handleRazorpayWebhook(rawBody, signature)).rejects.toThrow(
        /Razorpay order ID mismatch or payment not initiated for this order/i,
      );
      expect(mocks.tx.order.update).not.toHaveBeenCalled();
    });

    it('rejects webhook payment using untrusted notes.orderId alone when no matching Razorpay order was initiated', async () => {
      const uninitiatedOrder = createTestOrder({
        payment: {
          id: 'payment-counter-id',
          method: PaymentMethod.COUNTER,
          amount: '4.00',
          status: PaymentStatus.PENDING,
          transactionId: null, // Untrusted notes.orderId without initiated Razorpay order
        },
      });
      (prisma.order.findUnique as any).mockResolvedValue(uninitiatedOrder);

      const { rawBody, signature } = createWebhookPayload('payment.captured');

      await expect(paymentService.handleRazorpayWebhook(rawBody, signature)).rejects.toThrow(
        /Razorpay order ID mismatch or payment not initiated for this order/i,
      );
      expect(mocks.tx.order.update).not.toHaveBeenCalled();
      expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('Automatic Printing Workflow', () => {
    const razorpayOrderId = 'order_test_rzp12345';
    const razorpayPaymentId = 'pay_test_rzp98765';

    it('automatically dispatches to printer and online Agent without requiring operator manual click', async () => {
      const order = createTestOrder();
      (prisma.order.findUnique as any).mockResolvedValue(order);
      mocks.tx.order.findUnique.mockResolvedValue(order);

      // Auto-dispatch queries
      const paidWaitingOrder = {
        ...order,
        orderStatus: OrderStatus.WAITING,
        paymentStatus: PaymentStatus.SUCCESS,
      };
      (prisma.order.findFirst as any)
        .mockResolvedValueOnce(paidWaitingOrder) // oldestWaiting
        .mockResolvedValueOnce(null); // activeOrder (none running!)

      (prisma.device.findFirst as any).mockResolvedValue({
        id: 'device-01',
        deviceId: 'agent-pc-1',
      });
      mocks.isAgentConnected.mockResolvedValue(true);

      // Transaction queries for autoDispatchNextOrder
      mocks.tx.order.findFirst
        .mockResolvedValueOnce(null) // currentlyActive
        .mockResolvedValueOnce(paidWaitingOrder); // firstWaiting

      mocks.tx.printer.findFirst.mockResolvedValue({ id: PRINTER_ID, name: 'HP LaserJet 1018' });

      const validSig = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      vi.spyOn(paymentService as any, 'callRazorpayApi').mockResolvedValue({
        id: razorpayPaymentId,
        status: 'captured',
        amount: 400,
        currency: 'INR',
        order_id: razorpayOrderId,
      });

      const result = await paymentService.verifyRazorpayPayment({
        orderId: ORDER_ID,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSig,
      });

      expect(result.alreadyConfirmed).toBe(false);
      expect(result.dispatched).toBe(true);
      expect(result.orderStatus).toBe(OrderStatus.ASSIGNED);

      // Verify job.assigned was emitted to Agent without any operator manual click
      expect(emitToAgentDevice).toHaveBeenCalledWith(
        'agent-pc-1',
        'job.assigned',
        expect.objectContaining({
          orderId: ORDER_ID,
          printerName: 'HP LaserJet 1018',
        }),
      );
    });

    it('safely keeps paid order in WAITING if agent is offline without failing payment', async () => {
      const order = createTestOrder();
      (prisma.order.findUnique as any).mockResolvedValue(order);
      mocks.tx.order.findUnique.mockResolvedValue(order);

      const paidWaitingOrder = {
        ...order,
        orderStatus: OrderStatus.WAITING,
        paymentStatus: PaymentStatus.SUCCESS,
      };
      (prisma.order.findFirst as any)
        .mockResolvedValueOnce(paidWaitingOrder)
        .mockResolvedValueOnce(null);

      // Agent is completely offline
      mocks.isAgentConnected.mockResolvedValue(false);

      const validSig = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      vi.spyOn(paymentService as any, 'callRazorpayApi').mockResolvedValue({
        id: razorpayPaymentId,
        status: 'captured',
        amount: 400,
        currency: 'INR',
        order_id: razorpayOrderId,
      });

      const result = await paymentService.verifyRazorpayPayment({
        orderId: ORDER_ID,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSig,
      });

      // Payment succeeds safely and order waits in queue for agent to come online
      expect(result.alreadyConfirmed).toBe(false);
      expect(result.dispatched).toBe(false);
      expect(result.orderStatus).toBe(OrderStatus.WAITING);
      expect(emitToAgentDevice).not.toHaveBeenCalled();
    });

    it('agent reconnection triggers auto-dispatch for queued paid jobs', async () => {
      const paidWaitingOrder = createTestOrder({
        orderStatus: OrderStatus.WAITING,
        paymentStatus: PaymentStatus.SUCCESS,
      });

      // 1. Initial state: agent is offline when checked
      (prisma.order.findFirst as any)
        .mockResolvedValueOnce(paidWaitingOrder)
        .mockResolvedValueOnce(null);
      mocks.isAgentConnected.mockResolvedValueOnce(false);

      const offlineResult = await queueService.autoDispatchNextOrder(SHOP_ID);
      expect(offlineResult.dispatched).toBe(false);
      expect(offlineResult.reason).toBe('AGENT_OFFLINE');
      expect(emitToAgentDevice).not.toHaveBeenCalled();

      // 2. Agent reconnects and registers: device is online and connected
      (prisma.order.findFirst as any)
        .mockResolvedValueOnce(paidWaitingOrder)
        .mockResolvedValueOnce(null);
      (prisma.device.findFirst as any).mockResolvedValue({
        id: 'device-01',
        deviceId: 'agent-pc-1',
      });
      mocks.isAgentConnected.mockResolvedValue(true);

      mocks.tx.order.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(paidWaitingOrder);
      mocks.tx.printer.findFirst.mockResolvedValue({ id: PRINTER_ID, name: 'HP LaserJet 1018' });

      // Socket handshake triggers autoDispatchNextOrder(shopId) upon agent.register
      const reconnectResult = await queueService.autoDispatchNextOrder(SHOP_ID);
      expect(reconnectResult.dispatched).toBe(true);
      expect(reconnectResult.orderId).toBe(ORDER_ID);

      expect(emitToAgentDevice).toHaveBeenCalledWith(
        'agent-pc-1',
        'job.assigned',
        expect.objectContaining({
          orderId: ORDER_ID,
          printerName: 'HP LaserJet 1018',
        }),
      );
    });

    it('keeps order in WAITING if another job is currently printing, without failing payment', async () => {
      const order = createTestOrder();
      (prisma.order.findUnique as any).mockResolvedValue(order);
      mocks.tx.order.findUnique.mockResolvedValue(order);

      const paidWaitingOrder = {
        ...order,
        orderStatus: OrderStatus.WAITING,
        paymentStatus: PaymentStatus.SUCCESS,
      };
      (prisma.order.findFirst as any)
        .mockResolvedValueOnce(paidWaitingOrder)
        .mockResolvedValueOnce({ id: 'other-active-order-id' }); // Job already printing!

      const validSig = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      vi.spyOn(paymentService as any, 'callRazorpayApi').mockResolvedValue({
        id: razorpayPaymentId,
        status: 'captured',
        amount: 400,
        currency: 'INR',
        order_id: razorpayOrderId,
      });

      const result = await paymentService.verifyRazorpayPayment({
        orderId: ORDER_ID,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSig,
      });

      // Payment still succeeds! Order is safely in queue
      expect(result.alreadyConfirmed).toBe(false);
      expect(result.dispatched).toBe(false);
      expect(result.orderStatus).toBe(OrderStatus.WAITING);
      expect(emitToAgentDevice).not.toHaveBeenCalled();
    });
  });

  describe('Counter Payment Preservation', () => {
    it('still requires explicit operator confirmation for Pay at Counter orders', async () => {
      const counterOrder = createTestOrder({
        payment: {
          id: 'pay-counter-1',
          method: PaymentMethod.COUNTER,
          amount: '4.00',
          status: PaymentStatus.PENDING,
        },
      });

      mocks.tx.shop.findUnique.mockResolvedValue({ ownerId: OWNER_ID, status: 'ACTIVE' });
      mocks.tx.order.findUnique.mockResolvedValue(counterOrder);
      mocks.tx.payment.updateMany.mockResolvedValue({ count: 1 });

      const result = await paymentService.confirmCounterPayment(ORDER_ID, SHOP_ID, OWNER_ID);

      expect(result.orderStatus).toBe(OrderStatus.WAITING);
      expect(mocks.tx.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            method: PaymentMethod.COUNTER,
            status: PaymentStatus.PENDING,
          }),
        }),
      );
      expect(mocks.tx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paymentMethod: PaymentMethod.COUNTER,
        }),
      });
    });
  });
});
