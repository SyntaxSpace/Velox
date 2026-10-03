/**
 * Velox Shared Types
 *
 * Type definitions shared between frontend and backend.
 * These match the database schema from DATABASE.md and API contracts from API_SPEC.md.
 */

import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  PrinterType,
  PrinterStatus,
  ShopStatus,
  UserRole,
} from '../enums/index.js';

// ─── API Response Types (per PROJECT_RULES.md) ───────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: Record<string, unknown>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Entity Types (per DATABASE.md) ──────────────────────────────────

export interface Shop {
  id: string;
  publicShopId: string;
  name: string;
  createdByPartnerId?: string | null;
  ownerId: string | null;
  qrCode: string;
  address: string | null;
  city: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  operatingHours: string | null;
  status: ShopStatus;
  pricePerPageBW?: number;
  pricePerPageColor?: number;
  duplexDiscount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  shopId: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  firstLogin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Printer {
  id: string;
  shopId: string;
  name: string;
  printerType: PrinterType;
  status: PrinterStatus;
  ipAddress: string | null;
  pagesPerMinute: number;
  createdAt: string;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string | null;
  guestSessionId: string | null;
  shopId: string;
  printerId: string | null;
  queuePosition: number | null;
  totalPages: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  estimatedTime: number | null;
  createdAt: string;
}

export interface OrderFile {
  id: string;
  orderId: string;
  filename: string;
  fileUrl: string;
  pageCount: number;
  size: number;
  mimeType: string;
  deleteAfter: string | null;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  transactionId: string | null;
  status: PaymentStatus;
  createdAt: string;
}

export interface Transaction {
  id: string;
  shopId: string;
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  event: string;
  createdAt: string;
}

// ─── Guest Session (Day 7) ──────────────────────────────────────────

export interface GuestSession {
  sessionToken: string;
  guestSessionId: string;
  shopId: string;
  publicShopId: string;
  expiresAt: string;
}

// ─── Request Types (per API_SPEC.md) ─────────────────────────────────

export interface CreateOrderRequest {
  shopId: string;
  copies: number;
  color: boolean;
  doubleSided: boolean;
  paymentMethod: PaymentMethod;
}

export interface CreateShopRequest {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  operatingHours?: string;
  email?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ProvisionShopInput {
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  temporaryPassword?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  operatingHours?: string;
  pricePerPageBW?: number;
  pricePerPageColor?: number;
  duplexDiscount?: number;
}

export interface ProvisionShopResponse {
  shop: Shop;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: UserRole;
    firstLogin: boolean;
    temporaryPassword?: string;
  };
}

export interface UpdatePricingInput {
  pricePerPageBW?: number;
  pricePerPageColor?: number;
  duplexDiscount?: number;
}

export interface FirstLoginPasswordInput {
  temporaryPassword?: string;
  newPassword: string;
}

export interface PartnerStats {
  totalShops: number;
  activeShops: number;
  inactiveShops: number;
  totalOrdersToday: number;
  totalRevenueToday: number;
}

// ─── Agent Types (per WINDOWS_AGENT.md) ──────────────────────────────

export interface HeartbeatPayload {
  agentStatus: string;
  version: string;
  printerStatus: Record<string, PrinterStatus>;
  queueLength: number;
  lastActivity: string;
}

export interface PrintJob {
  orderId: string;
  orderCode: string;
  fileUrl: string;
  printerId: string;
  copies: number;
  color: boolean;
  doubleSided: boolean;
  pageRange: string | null;
  paperSize: string;
}
