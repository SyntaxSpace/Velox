import { OrderStatus } from '@prisma/client';
import { AppError } from '../utils/app-error';

// Order event types for audit trail
export enum OrderEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  QUEUE_ENTERED = 'QUEUE_ENTERED',
  ORDER_ASSIGNED = 'ORDER_ASSIGNED',
  PRINTING_STARTED = 'PRINTING_STARTED',
  PRINTING_COMPLETED = 'PRINTING_COMPLETED',
  ORDER_COLLECTED = 'ORDER_COLLECTED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PRINT_FAILED = 'PRINT_FAILED',
}

// Active queue states — orders in these states count toward queue position
export const ACTIVE_QUEUE_STATES: OrderStatus[] = [
  OrderStatus.WAITING,
  OrderStatus.ASSIGNED,
  OrderStatus.DOWNLOADING,
  OrderStatus.PRINTING,
];

// States from which an order can be cancelled
export const CANCELLABLE_STATES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.WAITING];

// Valid state transitions map
const VALID_TRANSITIONS: Map<OrderStatus, OrderStatus[]> = new Map([
  [OrderStatus.PENDING, [OrderStatus.WAITING, OrderStatus.CANCELLED]],
  [OrderStatus.WAITING, [OrderStatus.ASSIGNED, OrderStatus.CANCELLED]],
  [OrderStatus.ASSIGNED, [OrderStatus.DOWNLOADING]],
  [OrderStatus.DOWNLOADING, [OrderStatus.PRINTING]],
  [OrderStatus.PRINTING, [OrderStatus.COMPLETED, OrderStatus.FAILED]],
  [OrderStatus.COMPLETED, [OrderStatus.COLLECTED]],
  [OrderStatus.COLLECTED, [OrderStatus.DELETED]],
  [OrderStatus.FAILED, [OrderStatus.WAITING]],
]);

// Map transitions to their corresponding event types
const TRANSITION_EVENTS: Map<string, OrderEventType> = new Map([
  [`${OrderStatus.PENDING}->${OrderStatus.WAITING}`, OrderEventType.QUEUE_ENTERED],
  [`${OrderStatus.PENDING}->${OrderStatus.CANCELLED}`, OrderEventType.ORDER_CANCELLED],
  [`${OrderStatus.WAITING}->${OrderStatus.ASSIGNED}`, OrderEventType.ORDER_ASSIGNED],
  [`${OrderStatus.WAITING}->${OrderStatus.CANCELLED}`, OrderEventType.ORDER_CANCELLED],
  [`${OrderStatus.ASSIGNED}->${OrderStatus.DOWNLOADING}`, OrderEventType.ORDER_ASSIGNED],
  [`${OrderStatus.DOWNLOADING}->${OrderStatus.PRINTING}`, OrderEventType.PRINTING_STARTED],
  [`${OrderStatus.PRINTING}->${OrderStatus.COMPLETED}`, OrderEventType.PRINTING_COMPLETED],
  [`${OrderStatus.PRINTING}->${OrderStatus.FAILED}`, OrderEventType.PRINT_FAILED],
  [`${OrderStatus.COMPLETED}->${OrderStatus.COLLECTED}`, OrderEventType.ORDER_COLLECTED],
  [`${OrderStatus.FAILED}->${OrderStatus.WAITING}`, OrderEventType.QUEUE_ENTERED],
]);

export function validateTransition(from: OrderStatus, to: OrderStatus): void {
  const allowedTargets = VALID_TRANSITIONS.get(from);
  if (!allowedTargets || !allowedTargets.includes(to)) {
    throw AppError.badRequest(
      `Invalid state transition: ${from} → ${to}. Allowed from ${from}: ${allowedTargets?.join(', ') || 'none'}`,
    );
  }
}

export function getEventForTransition(from: OrderStatus, to: OrderStatus): OrderEventType {
  const key = `${from}->${to}`;
  const event = TRANSITION_EVENTS.get(key);
  if (!event) {
    return OrderEventType.ORDER_CREATED; // fallback — should not happen with valid transitions
  }
  return event;
}

export function isActiveQueueState(status: OrderStatus): boolean {
  return ACTIVE_QUEUE_STATES.includes(status);
}

export function isCancellable(status: OrderStatus): boolean {
  return CANCELLABLE_STATES.includes(status);
}
