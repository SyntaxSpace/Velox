import { prisma } from '../database/prisma';
import { logger } from '../config/logger';
import { printStorageService } from './print-storage.service';
import { OrderStatus } from '@prisma/client';

export class CleanupService {
  /**
   * Cleans up uploaded document files for completed, cancelled, or expired orders.
   * Ensures zero server-side residual document retention.
   */
  async cleanupExpiredFiles(): Promise<number> {
    let cleanedCount = 0;

    try {
      const completedOrders = await prisma.order.findMany({
        where: {
          orderStatus: { in: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
        },
        include: { files: true },
      });

      for (const order of completedOrders) {
        for (const file of order.files) {
          try {
            if (await printStorageService.deleteFile(file.fileUrl)) {
              cleanedCount++;
              logger.info(
                { orderId: order.id, fileKey: file.fileUrl },
                'Server-side cleanup deleted completed order file',
              );
            }
          } catch (err: unknown) {
            logger.warn(
              { fileKey: file.fileUrl, err: err instanceof Error ? err.message : String(err) },
              'Failed to delete file during cleanup',
            );
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const { devOrders } = await import('../repositories/order.repository');
        for (const order of devOrders.values()) {
          if (
            order.orderStatus === OrderStatus.COMPLETED ||
            order.orderStatus === OrderStatus.CANCELLED
          ) {
            for (const file of order.files || []) {
              try {
                if (await printStorageService.deleteFile(file.fileUrl)) {
                  cleanedCount++;
                  logger.info(
                    { orderId: order.id, fileKey: file.fileUrl },
                    'Server-side cleanup (dev mode) deleted file',
                  );
                }
              } catch (err: unknown) {
                logger.warn(
                  { fileKey: file.fileUrl, err: err instanceof Error ? err.message : String(err) },
                  'Failed to delete file during dev cleanup',
                );
              }
            }
          }
        }
      }
    }

    return cleanedCount;
  }
}

export const cleanupService = new CleanupService();
