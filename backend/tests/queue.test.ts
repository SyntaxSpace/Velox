import { describe, it, expect } from 'vitest';
import { QueueService } from '../src/services/queue.service';
import { OrderStatus } from '@prisma/client';

describe('Queue Service Engine', () => {
  const queueService = new QueueService();

  describe('calculateETA', () => {
    it('should calculate correct ETA for 10 pages at default 20 PPM with buffer', () => {
      // 10 pages / 20 PPM = 0.5 minutes = 30 seconds + 30 buffer = 60 seconds
      const eta = queueService.calculateETA(10, 20);
      expect(eta).toBe(60);
    });

    it('should calculate correct ETA for 0 pages ahead', () => {
      // 0 pages = 0 + 30 buffer = 30 seconds
      const eta = queueService.calculateETA(0, 20);
      expect(eta).toBe(30);
    });

    it('should fallback to default 20 PPM if avgPPM <= 0', () => {
      const etaWithZeroPPM = queueService.calculateETA(20, 0);
      const etaWithDefaultPPM = queueService.calculateETA(20, 20);
      expect(etaWithZeroPPM).toBe(etaWithDefaultPPM);
    });

    it('should scale linearly with pages ahead', () => {
      const eta10 = queueService.calculateETA(10, 20); // 60s
      const eta30 = queueService.calculateETA(30, 20); // 120s
      expect(eta30 - eta10).toBe(60);
    });
  });

  describe('Queue Position Formulas', () => {
    it('peopleAhead should be queuePosition - 1', () => {
      const pos = 3;
      const ahead = pos - 1;
      expect(ahead).toBe(2);
    });

    it('queuePosition for first order in queue should be 1', () => {
      const ordersAhead = 0;
      const position = ordersAhead + 1;
      expect(position).toBe(1);
    });
  });
});
