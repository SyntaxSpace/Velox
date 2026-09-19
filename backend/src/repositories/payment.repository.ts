import { Payment, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';

export class PaymentRepository {
  async findByOrderId(orderId: string, tx?: Prisma.TransactionClient): Promise<Payment | null> {
    const client = tx || prisma;
    return client.payment.findUnique({
      where: { orderId },
    });
  }

  async create(
    data: {
      orderId: string;
      method: PaymentMethod;
      amount: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const client = tx || prisma;
    return client.payment.create({
      data: {
        orderId: data.orderId,
        method: data.method,
        amount: new Prisma.Decimal(data.amount),
        status: PaymentStatus.PENDING,
      },
    });
  }

  async updateStatus(
    paymentId: string,
    status: PaymentStatus,
    transactionId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const client = tx || prisma;
    return client.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(transactionId ? { transactionId } : {}),
      },
    });
  }
}

export const paymentRepository = new PaymentRepository();
