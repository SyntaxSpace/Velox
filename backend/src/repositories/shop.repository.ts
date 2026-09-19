import { Shop, Printer } from '@prisma/client';
import { prisma } from '../database/prisma';

export interface ShopWithPrinters extends Shop {
  printers: Printer[];
}

export class ShopRepository {
  async findById(id: string): Promise<ShopWithPrinters | null> {
    return prisma.shop.findUnique({
      where: { id },
      include: {
        printers: {
          select: {
            id: true,
            name: true,
            printerType: true,
            status: true,
            pagesPerMinute: true,
            shopId: true,
            ipAddress: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async findByQrCode(qrCode: string): Promise<ShopWithPrinters | null> {
    return prisma.shop.findUnique({
      where: { qrCode },
      include: {
        printers: {
          select: {
            id: true,
            name: true,
            printerType: true,
            status: true,
            pagesPerMinute: true,
            shopId: true,
            ipAddress: true,
            createdAt: true,
          },
        },
      },
    });
  }
}

export const shopRepository = new ShopRepository();
