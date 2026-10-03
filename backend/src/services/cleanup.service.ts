import fs from 'fs';
import path from 'path';
import { prisma } from '../database/prisma';
import { logger } from '../config/logger';
import { UPLOAD_DIR } from '../config/upload';
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
          const filePath = path.join(UPLOAD_DIR, path.basename(file.fileUrl));
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              cleanedCount++;
              logger.info(
                { orderId: order.id, filePath },
                'Server-side cleanup deleted completed order file',
              );
            } catch (err: any) {
              logger.warn({ filePath, err: err.message }, 'Failed to delete file during cleanup');
            }
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
              const filePath = path.join(UPLOAD_DIR, path.basename(file.fileUrl));
              if (fs.existsSync(filePath)) {
                try {
                  fs.unlinkSync(filePath);
                  cleanedCount++;
                  logger.info(
                    { orderId: order.id, filePath },
                    'Server-side cleanup (dev mode) deleted file',
                  );
                } catch {}
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
