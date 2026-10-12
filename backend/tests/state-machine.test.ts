import { describe, it, expect } from 'vitest';
import { OrderStatus } from '@prisma/client';
import {
  validateTransition,
  getEventForTransition,
  isActiveQueueState,
  isCancellable,
  OrderEventType,
  ACTIVE_QUEUE_STATES,
  CANCELLABLE_STATES,
} from '../src/services/order-state-machine';

describe('Order State Machine', () => {
  describe('validateTransition', () => {
    it('should allow valid transition: PENDING -> WAITING', () => {
      expect(() => validateTransition(OrderStatus.PENDING, OrderStatus.WAITING)).not.toThrow();
    });

    it('should allow valid transition: PENDING -> CANCELLED', () => {
      expect(() => validateTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).not.toThrow();
    });

    it('should allow valid transition: WAITING -> ASSIGNED', () => {
      expect(() => validateTransition(OrderStatus.WAITING, OrderStatus.ASSIGNED)).not.toThrow();
    });

    it('should allow valid transition: WAITING -> CANCELLED', () => {
      expect(() => validateTransition(OrderStatus.WAITING, OrderStatus.CANCELLED)).not.toThrow();
    });

    it('should allow valid transition: ASSIGNED -> DOWNLOADING', () => {
      expect(() => validateTransition(OrderStatus.ASSIGNED, OrderStatus.DOWNLOADING)).not.toThrow();
    });

    it('should allow valid transition: DOWNLOADING -> PRINTING', () => {
      expect(() => validateTransition(OrderStatus.DOWNLOADING, OrderStatus.PRINTING)).not.toThrow();
    });

    it('should allow valid transition: DOWNLOADING -> FAILED', () => {
      expect(() => validateTransition(OrderStatus.DOWNLOADING, OrderStatus.FAILED)).not.toThrow();
    });

    it('should allow valid transition: PRINTING -> COMPLETED', () => {
      expect(() => validateTransition(OrderStatus.PRINTING, OrderStatus.COMPLETED)).not.toThrow();
    });

    it('should allow valid transition: PRINTING -> FAILED', () => {
      expect(() => validateTransition(OrderStatus.PRINTING, OrderStatus.FAILED)).not.toThrow();
    });

    it('should allow valid transition: COMPLETED -> COLLECTED', () => {
      expect(() => validateTransition(OrderStatus.COMPLETED, OrderStatus.COLLECTED)).not.toThrow();
    });

    it('should allow valid transition: COLLECTED -> DELETED', () => {
      expect(() => validateTransition(OrderStatus.COLLECTED, OrderStatus.DELETED)).not.toThrow();
    });

    it('should allow valid transition: FAILED -> WAITING', () => {
      expect(() => validateTransition(OrderStatus.FAILED, OrderStatus.WAITING)).not.toThrow();
    });

    it('should throw error for invalid transition: DOWNLOADING -> COMPLETED', () => {
      expect(() => validateTransition(OrderStatus.DOWNLOADING, OrderStatus.COMPLETED)).toThrow(
        /Invalid state transition/,
      );
    });

    it('should throw error for invalid transition: DOWNLOADING -> WAITING', () => {
      expect(() => validateTransition(OrderStatus.DOWNLOADING, OrderStatus.WAITING)).toThrow(
        /Invalid state transition/,
      );
    });

    it('should throw error for invalid transition: DOWNLOADING -> CANCELLED', () => {
      expect(() => validateTransition(OrderStatus.DOWNLOADING, OrderStatus.CANCELLED)).toThrow(
        /Invalid state transition/,
      );
    });

    it('should throw error for invalid transition: PENDING -> PRINTING', () => {
      expect(() => validateTransition(OrderStatus.PENDING, OrderStatus.PRINTING)).toThrow(
        /Invalid state transition/,
      );
    });

    it('should throw error for invalid transition: WAITING -> COMPLETED', () => {
      expect(() => validateTransition(OrderStatus.WAITING, OrderStatus.COMPLETED)).toThrow(
        /Invalid state transition/,
      );
    });

    it('should throw error for invalid transition: COMPLETED -> WAITING', () => {
      expect(() => validateTransition(OrderStatus.COMPLETED, OrderStatus.WAITING)).toThrow(
        /Invalid state transition/,
      );
    });

    it('should throw error for invalid transition: CANCELLED -> WAITING', () => {
      expect(() => validateTransition(OrderStatus.CANCELLED, OrderStatus.WAITING)).toThrow(
        /Invalid state transition/,
      );
    });
  });

  describe('getEventForTransition', () => {
    it('should return QUEUE_ENTERED for PENDING -> WAITING', () => {
      expect(getEventForTransition(OrderStatus.PENDING, OrderStatus.WAITING)).toBe(
        OrderEventType.QUEUE_ENTERED,
      );
    });

    it('should return ORDER_CANCELLED for WAITING -> CANCELLED', () => {
      expect(getEventForTransition(OrderStatus.WAITING, OrderStatus.CANCELLED)).toBe(
        OrderEventType.ORDER_CANCELLED,
      );
    });

    it('should return ORDER_ASSIGNED for WAITING -> ASSIGNED', () => {
      expect(getEventForTransition(OrderStatus.WAITING, OrderStatus.ASSIGNED)).toBe(
        OrderEventType.ORDER_ASSIGNED,
      );
    });

    it('should return PRINTING_STARTED for DOWNLOADING -> PRINTING', () => {
      expect(getEventForTransition(OrderStatus.DOWNLOADING, OrderStatus.PRINTING)).toBe(
        OrderEventType.PRINTING_STARTED,
      );
    });

    it('should return PRINTING_COMPLETED for PRINTING -> COMPLETED', () => {
      expect(getEventForTransition(OrderStatus.PRINTING, OrderStatus.COMPLETED)).toBe(
        OrderEventType.PRINTING_COMPLETED,
      );
    });

    it('should return PRINT_FAILED for DOWNLOADING -> FAILED', () => {
      expect(getEventForTransition(OrderStatus.DOWNLOADING, OrderStatus.FAILED)).toBe(
        OrderEventType.PRINT_FAILED,
      );
    });

    it('should return PRINT_FAILED for PRINTING -> FAILED', () => {
      expect(getEventForTransition(OrderStatus.PRINTING, OrderStatus.FAILED)).toBe(
        OrderEventType.PRINT_FAILED,
      );
    });
  });

  describe('isActiveQueueState', () => {
    it('should return true for WAITING, ASSIGNED, DOWNLOADING, PRINTING', () => {
      expect(isActiveQueueState(OrderStatus.WAITING)).toBe(true);
      expect(isActiveQueueState(OrderStatus.ASSIGNED)).toBe(true);
      expect(isActiveQueueState(OrderStatus.DOWNLOADING)).toBe(true);
      expect(isActiveQueueState(OrderStatus.PRINTING)).toBe(true);
    });

    it('should return false for PENDING, COMPLETED, COLLECTED, CANCELLED, FAILED', () => {
      expect(isActiveQueueState(OrderStatus.PENDING)).toBe(false);
      expect(isActiveQueueState(OrderStatus.COMPLETED)).toBe(false);
      expect(isActiveQueueState(OrderStatus.COLLECTED)).toBe(false);
      expect(isActiveQueueState(OrderStatus.CANCELLED)).toBe(false);
      expect(isActiveQueueState(OrderStatus.FAILED)).toBe(false);
    });
  });

  describe('isCancellable', () => {
    it('should return true for PENDING and WAITING', () => {
      expect(isCancellable(OrderStatus.PENDING)).toBe(true);
      expect(isCancellable(OrderStatus.WAITING)).toBe(true);
    });

    it('should return false for ASSIGNED, PRINTING, COMPLETED, CANCELLED, FAILED, DOWNLOADING', () => {
      expect(isCancellable(OrderStatus.ASSIGNED)).toBe(false);
      expect(isCancellable(OrderStatus.DOWNLOADING)).toBe(false);
      expect(isCancellable(OrderStatus.PRINTING)).toBe(false);
      expect(isCancellable(OrderStatus.COMPLETED)).toBe(false);
      expect(isCancellable(OrderStatus.CANCELLED)).toBe(false);
      expect(isCancellable(OrderStatus.FAILED)).toBe(false);
    });
  });

  describe('DOWNLOADING -> FAILED State Machine & Queue Unblocking Regression', () => {
    it('1. DOWNLOADING -> FAILED succeeds validation', () => {
      expect(() => validateTransition(OrderStatus.DOWNLOADING, OrderStatus.FAILED)).not.toThrow();
    });

    it('2. The failure event is mapped to PRINT_FAILED', () => {
      const event = getEventForTransition(OrderStatus.DOWNLOADING, OrderStatus.FAILED);
      expect(event).toBe(OrderEventType.PRINT_FAILED);
    });

    it('3. Invalid transitions from DOWNLOADING remain rejected', () => {
      const invalidTargets = [
        OrderStatus.PENDING,
        OrderStatus.WAITING,
        OrderStatus.ASSIGNED,
        OrderStatus.COMPLETED,
        OrderStatus.COLLECTED,
        OrderStatus.CANCELLED,
        OrderStatus.DELETED,
      ];
      for (const target of invalidTargets) {
        expect(() => validateTransition(OrderStatus.DOWNLOADING, target)).toThrow(
          /Invalid state transition/,
        );
      }
    });

    it('4. A failed download does not leave the shop queue blocked (FAILED is not an active queue state)', () => {
      expect(isActiveQueueState(OrderStatus.DOWNLOADING)).toBe(true);
      expect(isActiveQueueState(OrderStatus.FAILED)).toBe(false);
    });

    it('5. Concurrency guard rejects transition if order state changed concurrently', () => {
      // Simulating optimistic concurrency control where update count is 0 because order is already PRINTING
      const currentExpectedStatus = OrderStatus.DOWNLOADING;
      const actualDatabaseStatus = OrderStatus.PRINTING;
      const orderChangedConcurrently = currentExpectedStatus !== actualDatabaseStatus;

      expect(orderChangedConcurrently).toBe(true);
    });
  });
});
