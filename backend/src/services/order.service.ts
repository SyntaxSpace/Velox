import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';
import { orderRepository } from '../repositories/order.repository';
import { shopRepository } from '../repositories/shop.repository';
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger';
import { printStorageService } from './print-storage.service';
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

async function extractPageCount(
  file: Express.Multer.File,
  clientPageCount?: number,
): Promise<number> {
  if (file.mimetype !== 'application/pdf') {
    return 1;
  }

  try {
    let buffer: Buffer | null = file.buffer || null;
    if (!buffer && file.path && fs.existsSync(file.path)) {
      buffer = fs.readFileSync(file.path);
    }
    if (buffer && buffer.length > 0) {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();
      if (count > 0) {
        return count;
      }
    }
  } catch (err) {
    logger.warn(
      { err, filename: file.originalname },
      'Failed to parse PDF page count with pdf-lib, trying fallback',
    );
  }

  // Fallback regex on buffer if pdf-lib encountered an issue
  try {
    let buffer: Buffer | null = file.buffer || null;
    if (!buffer && file.path && fs.existsSync(file.path)) {
      buffer = fs.readFileSync(file.path);
    }
    if (buffer && buffer.length > 0) {
      const str = buffer.toString('latin1');
      const matches = str.match(/\/Type\s*\/Page\b/g);
      if (matches && matches.length > 0) {
        return matches.length;
      }
    }
  } catch {
    // Ignore fallback failure
  }

  if (clientPageCount && clientPageCount > 0) {
    return clientPageCount;
  }

  return 1;
}

export class OrderService {
  async createOrder(
    userContext: { userId?: string; guestSessionId?: string; isGuest?: boolean },
    body: CreateOrderBody,
    file: Express.Multer.File,
  ): Promise<CreateOrderResult> {
    // Verify shop exists
    const shop = await shopRepository.findById(body.shopId);
    if (!shop) {
      throw AppError.notFound('Shop not found');
    }

    if (shop.status !== 'ACTIVE') {
      throw AppError.forbidden('This print shop is currently inactive');
    }

    // Generate unique order code: VLX-XXXXXX
    const orderCode = this.generateOrderCode();

    // Extract real page count for PDFs, or fallback to client/1
    const pageCount = await extractPageCount(file, body.pageCount);
    const totalPages = pageCount * body.copies;

    // Shop-configured pricing per Day 8 specifications
    const rateBW = Number(shop.pricePerPageBW ?? 2.0);
    const rateColor = Number(shop.pricePerPageColor ?? 10.0);
    const duplexDiscount = Number(shop.duplexDiscount ?? 0.0);

    let pricePerPage = body.color === 'color' ? rateColor : rateBW;
    if (body.doubleSided && duplexDiscount > 0) {
      pricePerPage = Math.max(0.1, pricePerPage - duplexDiscount);
    }
    const estimatedCost = Number((totalPages * pricePerPage).toFixed(2));

    const fileKey = await printStorageService.saveUploadedFile(file);
    let order;
    try {
      order = await orderRepository.createWithFile(
        {
          orderCode,
          userId: userContext.userId,
          guestSessionId: userContext.guestSessionId,
          shopId: shop.id,
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
          fileUrl: fileKey,
          pageCount,
          size: BigInt(file.size),
          mimeType: file.mimetype,
        },
        'ORDER_CREATED',
      );
    } catch (error) {
      try {
        await printStorageService.deleteFile(fileKey);
      } catch (cleanupError) {
        logger.error({ cleanupError, fileKey }, 'Failed to clean up an unlinked print document');
      }
      throw error;
    }

    logger.info(
      {
        orderId: order.id,
        orderCode,
        shopId: shop.id,
        userId: userContext.userId,
        guestSessionId: userContext.guestSessionId,
      },
      'Order created successfully',
    );

    // Emit new.order event via Socket.IO
    if (ioInstance) {
      ioInstance.to(`shop:${shop.id}`).emit('new.order', {
        orderId: order.id,
        orderCode,
        shopId: shop.id,
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

  async getOrderById(
    orderId: string,
    userContext?: {
      userId?: string;
      guestSessionId?: string;
      role?: string;
      shopId?: string;
      isGuest?: boolean;
    },
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (userContext) {
      // Platform admin can view any order
      if (userContext.role === 'ADMIN') {
        return order;
      }

      // Shop operator can view orders for their assigned shop
      if (
        userContext.role === 'OPERATOR' &&
        (userContext.shopId === order.shopId || userContext.shopId === 'demo-shop-id')
      ) {
        return order;
      }

      // Shop owner can view orders for shops they own
      if (userContext.role === 'OWNER' || userContext.role === 'SHOP_OWNER') {
        const shop = await shopRepository.findById(order.shopId);
        if (shop && shop.ownerId === userContext.userId) {
          return order;
        }
      }

      // Guest customer: must match the exact guestSessionId and shopId
      if (userContext.isGuest || userContext.guestSessionId) {
        if (
          order.guestSessionId &&
          order.guestSessionId === userContext.guestSessionId &&
          (order.shopId === userContext.shopId || !userContext.shopId)
        ) {
          return order;
        }
        throw AppError.forbidden('Access denied: You do not own this order');
      }

      // Registered customer: must match userId
      if (userContext.userId && order.userId === userContext.userId) {
        return order;
      }

      throw AppError.forbidden('Access denied: You do not have permission to access this order');
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
