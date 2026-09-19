import crypto from 'crypto';
import { orderRepository } from '../repositories/order.repository';
import { shopRepository } from '../repositories/shop.repository';
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger';
import { CreateOrderBody } from '../validators/order.validator';

export interface CreateOrderResult {
  orderId: string;
  orderCode: string;
  status: string;
  totalPages: number;
  estimatedCost: number;
}

// Socket.IO instance - set by server.ts after initialization
let ioInstance: any = null;
export function setSocketIO(io: any): void {
  ioInstance = io;
}

export class OrderService {
  async createOrder(
    userId: string,
    body: CreateOrderBody,
    file: Express.Multer.File,
  ): Promise<CreateOrderResult> {
    // Verify shop exists
    const shop = await shopRepository.findById(body.shopId);
    if (!shop) {
      throw AppError.notFound('Shop not found');
    }

    // Generate unique order code: VLX-XXXXXX
    const orderCode = this.generateOrderCode();

    // Placeholder page count (1 for images, 1 for PDFs without parsing)
    const pageCount = 1;
    const totalPages = pageCount * body.copies;

    // Placeholder pricing: ₹2/page BW, ₹10/page Color
    const pricePerPage = body.color === 'color' ? 10 : 2;
    const estimatedCost = totalPages * pricePerPage;

    const order = await orderRepository.createWithFile(
      {
        orderCode,
        userId,
        shopId: body.shopId,
        totalPages,
        totalPrice: estimatedCost,
        copies: body.copies,
        color: body.color,
        doubleSided: body.doubleSided,
        orientation: body.orientation,
        paperSize: body.paperSize,
        paymentMethod: body.paymentMethod,
      },
      {
        filename: file.originalname,
        fileUrl: file.filename, // UUID-based filename on disk
        pageCount,
        size: BigInt(file.size),
        mimeType: file.mimetype,
      },
      'ORDER_CREATED',
    );

    logger.info(
      { orderId: order.id, orderCode, shopId: body.shopId, userId },
      'Order created successfully',
    );

    // Emit new.order event via Socket.IO
    if (ioInstance) {
      ioInstance.to(`shop:${body.shopId}`).emit('new.order', {
        orderId: order.id,
        orderCode,
        shopId: body.shopId,
        totalPages,
        estimatedCost,
        createdAt: order.createdAt,
      });
      logger.info({ orderId: order.id }, 'Emitted new.order socket event');
    }

    return {
      orderId: order.id,
      orderCode,
      status: order.orderStatus,
      totalPages,
      estimatedCost,
    };
  }

  async getOrderById(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }
    return order;
  }

  private generateOrderCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return `VLX-${code}`;
  }
}

export const orderService = new OrderService();
