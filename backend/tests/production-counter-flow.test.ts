import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../src/database/prisma';
import { agentService } from '../src/services/agent.service';
import { PaymentService } from '../src/services/payment.service';
import { QueueService } from '../src/services/queue.service';
import { emitToAgentDevice, emitToClientShop, isAgentConnected } from '../src/socket';

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    shop: { findUnique: vi.fn() },
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: { updateMany: vi.fn() },
    transaction: { create: vi.fn() },
    orderEvent: { create: vi.fn(), createMany: vi.fn() },
    device: { findFirst: vi.fn() },
    printer: { findFirst: vi.fn() },
  };

  return {
    tx,
    db: {
      $transaction: vi.fn(),
      order: { findUnique: vi.fn() },
      shop: { findUnique: vi.fn() },
      device: { findFirst: vi.fn() },
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
const OTHER_SHOP_ID = '22222222-2222-4222-8222-222222222222';
const OWNER_ID = '33333333-3333-4333-8333-333333333333';
const ORDER_ID = '44444444-4444-4444-8444-444444444444';
const PRINTER_ID = '55555555-5555-4555-8555-555555555555';

function setTransactionMock() {
  (prisma.$transaction as any).mockImplementation((operation: (tx: typeof mocks.tx) => unknown) =>
    operation(mocks.tx),
  );
}

function setCounterOrder(overrides: Record<string, unknown> = {}) {
  const order = {
    id: ORDER_ID,
    orderCode: 'VLX-ABC234',
    shopId: SHOP_ID,
    orderStatus: 'PENDING',
    paymentStatus: 'PENDING',
    totalPages: 1,
    totalPrice: '2.00',
    copies: 1,
    color: 'bw',
    doubleSided: false,
    orientation: 'portrait',
    paperSize: 'A4',
    files: [{ id: 'file-id' }],
    payment: { id: 'payment-id', method: 'COUNTER', amount: '2.00', status: 'PENDING' },
    ...overrides,
  };
  mocks.tx.order.findUnique.mockResolvedValue(order);
  return order;
}

describe('Production counter payment and print dispatch', () => {
  const paymentService = new PaymentService();
  const queueService = new QueueService();

  beforeEach(() => {
    vi.clearAllMocks();
    setTransactionMock();
    (prisma.order.findUnique as any).mockReset();
    (prisma.shop.findUnique as any).mockResolvedValue({ ownerId: OWNER_ID, status: 'ACTIVE' });
    (prisma.device.findFirst as any).mockResolvedValue({ id: 'device-id', deviceId: 'agent-01' });
    mocks.isAgentConnected.mockResolvedValue(true);
    mocks.tx.$queryRaw.mockResolvedValue([{ id: SHOP_ID, ownerId: OWNER_ID, status: 'ACTIVE' }]);
    mocks.tx.shop.findUnique.mockResolvedValue({ ownerId: OWNER_ID, status: 'ACTIVE' });
    mocks.tx.payment.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.transaction.create.mockResolvedValue({ id: 'transaction-id' });
    mocks.tx.orderEvent.createMany.mockResolvedValue({ count: 3 });
    mocks.tx.orderEvent.create.mockResolvedValue({ id: 'event-id' });
    mocks.getAuthorizedOrderFile.mockResolvedValue({ checksum: 'a'.repeat(64), size: 128 });
  });

  it('confirms cash exactly once and atomically records the queue entry and ledger transaction', async () => {
    setCounterOrder();

    const result = await paymentService.confirmCounterPayment(ORDER_ID, SHOP_ID, OWNER_ID);

    expect(result).toEqual({
      orderId: ORDER_ID,
      orderStatus: 'WAITING',
      alreadyConfirmed: false,
    });
    expect(mocks.tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }),
    );
    expect(mocks.tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shopId: SHOP_ID,
        orderId: ORDER_ID,
        paymentMethod: 'COUNTER',
      }),
    });
    expect(mocks.tx.orderEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ event: 'COUNTER_PAYMENT_CONFIRMED' }),
        expect.objectContaining({ event: 'QUEUE_ENTERED' }),
      ]),
    });
    expect(emitToClientShop).toHaveBeenCalledWith(SHOP_ID, 'queue.updated', expect.any(Object));
  });

  it('rejects an order belonging to a different shop before recording money', async () => {
    setCounterOrder({ shopId: OTHER_SHOP_ID });

    await expect(paymentService.confirmCounterPayment(ORDER_ID, SHOP_ID, OWNER_ID)).rejects.toThrow(
      /does not belong to your shop/,
    );
    expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
  });

  it('rejects a non-counter payment method', async () => {
    setCounterOrder({
      payment: { id: 'payment-id', method: 'UPI', amount: '2.00', status: 'PENDING' },
    });

    await expect(paymentService.confirmCounterPayment(ORDER_ID, SHOP_ID, OWNER_ID)).rejects.toThrow(
      /Only pay-at-counter/,
    );
    expect(mocks.tx.payment.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a caller who does not own the shop', async () => {
    setCounterOrder();
    mocks.tx.shop.findUnique.mockResolvedValue({ ownerId: 'other-owner-id', status: 'ACTIVE' });

    await expect(paymentService.confirmCounterPayment(ORDER_ID, SHOP_ID, OWNER_ID)).rejects.toThrow(
      /do not own this shop/,
    );
    expect(mocks.tx.payment.updateMany).not.toHaveBeenCalled();
  });

  it('makes a repeated confirmation idempotent without duplicating a transaction', async () => {
    setCounterOrder({
      orderStatus: 'WAITING',
      paymentStatus: 'SUCCESS',
      payment: { id: 'payment-id', method: 'COUNTER', amount: '2.00', status: 'SUCCESS' },
    });

    const result = await paymentService.confirmCounterPayment(ORDER_ID, SHOP_ID, OWNER_ID);

    expect(result.alreadyConfirmed).toBe(true);
    expect(mocks.tx.transaction.create).not.toHaveBeenCalled();
    expect(emitToClientShop).not.toHaveBeenCalled();
  });

  it('scopes Agent status updates to the shop in the authenticated socket', async () => {
    mocks.tx.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      shopId: SHOP_ID,
      orderStatus: 'ASSIGNED',
    });
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });

    await queueService.transitionOrder(ORDER_ID, OrderStatus.DOWNLOADING, SHOP_ID);

    expect(mocks.tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, shopId: SHOP_ID, orderStatus: 'ASSIGNED' },
      data: { orderStatus: 'DOWNLOADING' },
    });
    expect(emitToClientShop).toHaveBeenCalledWith(SHOP_ID, 'order.status.changed', {
      orderId: ORDER_ID,
      orderStatus: 'DOWNLOADING',
      previousStatus: 'ASSIGNED',
    });
  });

  it('rejects Agent status updates for a different shop', async () => {
    mocks.tx.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      shopId: OTHER_SHOP_ID,
      orderStatus: 'ASSIGNED',
    });

    await expect(
      queueService.transitionOrder(ORDER_ID, OrderStatus.DOWNLOADING, SHOP_ID),
    ).rejects.toThrow(/another shop/);
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
    expect(emitToClientShop).not.toHaveBeenCalled();
  });

  it('dispatches the oldest eligible order to an online Agent and B&W printer', async () => {
    const order = setCounterOrder({
      orderStatus: 'WAITING',
      paymentStatus: 'SUCCESS',
    });
    mocks.tx.order.findFirst.mockResolvedValueOnce({ id: ORDER_ID }).mockResolvedValueOnce(null);
    mocks.tx.device.findFirst.mockResolvedValue({ id: 'device-id', deviceId: 'agent-01' });
    mocks.tx.printer.findFirst.mockResolvedValue({ id: PRINTER_ID, name: 'HP LaserJet P1108' });
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
    (prisma.order as any).findUnique = vi.fn().mockResolvedValue(order);

    const result = await queueService.dispatchNextOrder(ORDER_ID, SHOP_ID, OWNER_ID);

    expect(result).toEqual({
      orderId: ORDER_ID,
      orderCode: 'VLX-ABC234',
      printerName: 'HP LaserJet P1108',
      orderStatus: 'ASSIGNED',
    });
    expect(mocks.tx.printer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shopId: SHOP_ID,
          status: 'ONLINE',
          printerType: 'BLACK_WHITE',
        }),
      }),
    );
    expect(emitToAgentDevice).toHaveBeenCalledWith(
      'agent-01',
      'job.assigned',
      expect.objectContaining({ orderId: ORDER_ID, expectedChecksum: 'a'.repeat(64) }),
    );
  });

  it('blocks dispatch when an older paid order is ahead in the queue', async () => {
    const order = setCounterOrder({ orderStatus: 'WAITING', paymentStatus: 'SUCCESS' });
    mocks.tx.order.findFirst.mockResolvedValueOnce({ id: 'older-order-id' });
    (prisma.order as any).findUnique = vi.fn().mockResolvedValue(order);

    await expect(queueService.dispatchNextOrder(ORDER_ID, SHOP_ID, OWNER_ID)).rejects.toThrow(
      /oldest paid order/,
    );
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
    expect(emitToAgentDevice).not.toHaveBeenCalled();
  });

  it('blocks dispatch when the Agent has no recent heartbeat', async () => {
    const order = setCounterOrder({ orderStatus: 'WAITING', paymentStatus: 'SUCCESS' });
    mocks.tx.order.findFirst.mockResolvedValueOnce({ id: ORDER_ID }).mockResolvedValueOnce(null);
    (prisma.device.findFirst as any).mockResolvedValue(null);
    mocks.tx.device.findFirst.mockResolvedValue(null);
    (prisma.order as any).findUnique = vi.fn().mockResolvedValue(order);

    await expect(queueService.dispatchNextOrder(ORDER_ID, SHOP_ID, OWNER_ID)).rejects.toThrow(
      /Agent is disconnected/,
    );
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
    expect(emitToAgentDevice).not.toHaveBeenCalled();
  });

  it('does not mark the order assigned when the Agent socket is disconnected', async () => {
    setCounterOrder({ orderStatus: 'WAITING', paymentStatus: 'SUCCESS' });
    mocks.isAgentConnected.mockResolvedValue(false);
    (prisma.order as any).findUnique = vi.fn().mockResolvedValue({
      ...setCounterOrder({ orderStatus: 'WAITING', paymentStatus: 'SUCCESS' }),
    });

    await expect(queueService.dispatchNextOrder(ORDER_ID, SHOP_ID, OWNER_ID)).rejects.toThrow(
      /Agent is disconnected/,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(emitToAgentDevice).not.toHaveBeenCalled();
  });

  it('rejects a repeated dispatch after the order has left WAITING', async () => {
    const order = setCounterOrder({ orderStatus: 'ASSIGNED', paymentStatus: 'SUCCESS' });
    (prisma.order.findUnique as any).mockResolvedValue(order);

    await expect(queueService.dispatchNextOrder(ORDER_ID, SHOP_ID, OWNER_ID)).rejects.toThrow(
      /Only paid orders waiting/,
    );
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
    expect(emitToAgentDevice).not.toHaveBeenCalled();
  });

  it('rejects unsafe print specifications before reading or dispatching the document', async () => {
    const order = setCounterOrder({
      orderStatus: 'WAITING',
      paymentStatus: 'SUCCESS',
      paperSize: 'A3',
    });
    (prisma.order as any).findUnique = vi.fn().mockResolvedValue(order);

    await expect(queueService.dispatchNextOrder(ORDER_ID, SHOP_ID, OWNER_ID)).rejects.toThrow(
      /B&W A4/,
    );
    expect(agentService.getAuthorizedOrderFile).not.toHaveBeenCalled();
  });
});
