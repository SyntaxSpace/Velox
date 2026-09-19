import { api } from '@/lib/api';

export interface DashboardStats {
  todayOrders: number;
  activeOrders: number;
  totalRevenue: number;
  completedToday: number;
}

export interface AdminOrder {
  id: string;
  orderCode: string;
  totalPages: number;
  totalPrice: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  files: Array<{
    id: string;
    filename: string;
    pageCount: number;
    mimeType: string;
  }>;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await api.get('/admin/stats');
  return response.data.data;
}

export async function getTodayOrders(): Promise<AdminOrder[]> {
  const response = await api.get('/admin/orders/today');
  return response.data.data;
}

export async function getOrders(page = 1, limit = 20) {
  const response = await api.get(`/admin/orders?page=${page}&limit=${limit}`);
  return response.data;
}

export interface QueueOrder {
  id: string;
  orderCode: string;
  orderStatus: string;
  queuePosition: number;
  totalPages: number;
  copies: number;
  color: string;
  doubleSided: boolean;
  paperSize: string;
  estimatedWaitSeconds: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface ShopQueueData {
  shopId: string;
  totalInQueue: number;
  averageWaitSeconds: number;
  orders: QueueOrder[];
}

export async function getQueueOrders(): Promise<ShopQueueData> {
  const response = await api.get('/admin/queue');
  return response.data.data;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  await api.patch(`/admin/orders/${orderId}/status`, { status });
}

export interface AdminPrinter {
  id: string;
  name: string;
  printerType: string;
  status: string;
  ipAddress?: string | null;
  pagesPerMinute: number;
  createdAt: string;
}

export interface AdminDevice {
  deviceId: string;
  name: string;
  status: string;
  lastHeartbeat?: string | null;
}

export interface ShopPrintersData {
  printers: AdminPrinter[];
  devices: AdminDevice[];
}

export async function getShopPrinters(): Promise<ShopPrintersData> {
  const response = await api.get('/admin/printers');
  return response.data.data;
}

export async function updatePrinterStatus(printerId: string, status: string): Promise<void> {
  await api.patch(`/admin/printers/${printerId}/status`, { status });
}
