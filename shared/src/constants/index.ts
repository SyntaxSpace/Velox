/**
 * Velox Shared Constants
 *
 * Application-wide constants used across frontend and backend.
 * Values derived from API_SPEC.md, QUEUE_ENGINE.md, SECURITY.md, WINDOWS_AGENT.md.
 */

/** API configuration per API_SPEC.md */
export const API = {
  VERSION: 'v1',
  BASE_PATH: '/api/v1',
  DEV_URL: 'http://localhost:5000/api/v1',
  PROD_URL: 'https://api.velox.app/api/v1',
} as const;

/** Rate limits per API_SPEC.md and SECURITY.md */
export const RATE_LIMITS = {
  GUEST_REQUESTS_PER_MINUTE: 30,
  AUTH_REQUESTS_PER_MINUTE: 100,
} as const;

/** File upload constraints per PROJECT_RULES.md and SECURITY.md */
export const FILE_UPLOAD = {
  ALLOWED_EXTENSIONS: ['.pdf', '.png', '.jpg', '.jpeg'] as const,
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg'] as const,
  MAX_SIZE_MB: 50,
  MAX_SIZE_BYTES: 50 * 1024 * 1024,
  MIN_COPIES: 1,
  MAX_COPIES: 100,
} as const;

/** Queue engine settings per QUEUE_ENGINE.md */
export const QUEUE = {
  MAX_RETRY_COUNT: 3,
  ETA_BUFFER_SECONDS: 30,
  DEFAULT_PRIORITY: 'NORMAL' as const,
} as const;

/** JWT settings per SECURITY.md */
export const AUTH = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '30d',
  MIN_PASSWORD_LENGTH: 8,
  RECOMMENDED_PASSWORD_LENGTH: 12,
} as const;

/** Windows Agent settings per WINDOWS_AGENT.md */
export const AGENT = {
  HEARTBEAT_INTERVAL_MS: 30_000,
  RECONNECT_TIMEOUT_MS: 10_000,
  MAX_RAM_MB: 150,
  STARTUP_TIMEOUT_MS: 5_000,
} as const;

/** Socket.IO namespaces per BACKEND_GUIDELINES.md */
export const SOCKET_NAMESPACES = {
  CUSTOMER: '/customer',
  ADMIN: '/admin',
  AGENT: '/agent',
} as const;

/** WebSocket events per API_SPEC.md */
export const SOCKET_EVENTS = {
  // Customer events
  ORDER_CREATED: 'order.created',
  PAYMENT_SUCCESS: 'payment.success',
  QUEUE_UPDATED: 'queue.updated',
  PRINTING_STARTED: 'printing.started',
  PRINTING_COMPLETED: 'printing.completed',
  ORDER_READY: 'order.ready',
  // Operator events
  NEW_ORDER: 'new.order',
  PRINTER_OFFLINE: 'printer.offline',
  QUEUE_CHANGED: 'queue.changed',
  PAYMENT_RECEIVED: 'payment.received',
  // Agent events
  AGENT_CONNECTED: 'agent.connected',
  AGENT_DISCONNECTED: 'agent.disconnected',
  JOB_RECEIVED: 'job.received',
  JOB_COMPLETED: 'job.completed',
  PRINTER_ERROR: 'printer.error',
} as const;
