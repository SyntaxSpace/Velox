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

    it('should return false for ASSIGNED, PRINTING, COMPLETED, CANCELLED', () => {
      expect(isCancellable(OrderStatus.ASSIGNED)).toBe(false);
      expect(isCancellable(OrderStatus.PRINTING)).toBe(false);
      expect(isCancellable(OrderStatus.COMPLETED)).toBe(false);
      expect(isCancellable(OrderStatus.CANCELLED)).toBe(false);
    });
  });
});
