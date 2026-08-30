/**
 * Velox Shared Enums
 *
 * All enums used across frontend, backend, and shared validation.
 * These are the single source of truth per PROJECT_RULES.md.
 */

/** User roles per DATABASE.md and SECURITY.md */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  OPERATOR = 'OPERATOR',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
}

/** Order lifecycle states per QUEUE_ENGINE.md */
export enum OrderStatus {
  PENDING = 'PENDING',
  WAITING = 'WAITING',
  ASSIGNED = 'ASSIGNED',
  DOWNLOADING = 'DOWNLOADING',
  PRINTING = 'PRINTING',
  COMPLETED = 'COMPLETED',
  COLLECTED = 'COLLECTED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

/** Payment statuses per DATABASE.md */
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/** Payment methods per DATABASE.md */
export enum PaymentMethod {
  UPI = 'UPI',
  COUNTER = 'COUNTER',
  CARD = 'CARD',
}

/** Printer types per DATABASE.md and QUEUE_ENGINE.md */
export enum PrinterType {
  BLACK_WHITE = 'BLACK_WHITE',
  COLOR = 'COLOR',
  BULK = 'BULK',
}

/** Printer statuses per DATABASE.md */
export enum PrinterStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  PRINTING = 'PRINTING',
  PAUSED = 'PAUSED',
}

/** Shop statuses */
export enum ShopStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/** Windows Agent statuses per WINDOWS_AGENT.md */
export enum AgentStatus {
  CONNECTED = 'CONNECTED',
  DOWNLOADING = 'DOWNLOADING',
  QUEUED = 'QUEUED',
  PRINTING = 'PRINTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  OFFLINE = 'OFFLINE',
}

/** Allowed file MIME types per PROJECT_RULES.md */
export enum AllowedMimeType {
  PDF = 'application/pdf',
  PNG = 'image/png',
  JPG = 'image/jpeg',
}
