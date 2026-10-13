import { api } from '@/lib/api';

export interface ShopPrinter {
  id: string;
  name: string;
  printerType: string;
  status: string;
  pagesPerMinute: number;
}

export interface ShopData {
  id: string;
  publicShopId?: string;
  name: string;
  ownerId?: string | null;
  createdByPartnerId?: string | null;
  qrCode: string;
  address: string | null;
  city?: string | null;
  pincode?: string | null;
  phone: string | null;
  email: string | null;
  operatingHours?: string | null;
  pricePerPageBW?: number;
  pricePerPageColor?: number;
  duplexDiscount?: number;
  status: string;
  printers: ShopPrinter[];
  estimatedWait: number;
}

export interface GuestSessionData {
  sessionToken: string;
  guestSessionId: string;
  shopId: string;
  publicShopId: string;
  expiresAt: string;
}

export interface CreateShopInput {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  operatingHours?: string;
  email?: string;
}

export async function getShop(shopId: string): Promise<ShopData> {
  const response = await api.get(`/shops/${shopId}`);
  return response.data.data;
}

export async function getPublicShop(publicShopId: string): Promise<ShopData> {
  try {
    const response = await api.get(`/public/shops/${publicShopId}`);
    return response.data.data;
  } catch {
    // Fallback to /shops/:id for backward compatibility
    return getShop(publicShopId);
  }
}

export async function createGuestSession(publicShopId: string): Promise<GuestSessionData> {
  const response = await api.post(`/public/shops/${publicShopId}/session`);
  return response.data.data;
}

export async function getMyShops(): Promise<ShopData[]> {
  const response = await api.get('/shops');
  return response.data.data;
}

export async function createShop(data: CreateShopInput): Promise<ShopData> {
  const response = await api.post('/shops', data);
  return response.data.data;
}

export async function updateShop(
  shopId: string,
  data: Partial<CreateShopInput>,
): Promise<ShopData> {
  const response = await api.patch(`/shops/${shopId}`, data);
  return response.data.data;
}

export interface AdminDevice {
  deviceId: string;
  name: string;
  status: string;
  lastHeartbeat?: string | null;
}

export interface ShopPrintersResponse {
  printers: ShopPrinter[];
  devices: AdminDevice[];
}

export async function getShopPrinters(shopId: string): Promise<ShopPrintersResponse> {
  const response = await api.get(`/shops/${shopId}/printers`);
  return response.data.data;
}

export interface ShopPricing {
  pricePerPageBW: number;
  pricePerPageColor: number;
  duplexDiscount: number;
}

export async function getShopPricing(shopId: string): Promise<ShopPricing> {
  const response = await api.get(`/shops/${shopId}/pricing`);
  return response.data.data;
}

export async function updateShopPricing(
  shopId: string,
  pricing: Partial<ShopPricing>,
): Promise<ShopData> {
  const response = await api.patch(`/shops/${shopId}/pricing`, pricing);
  return response.data.data;
}

export async function firstLoginChangePassword(
  temporaryPassword: string,
  newPassword: string,
): Promise<{ user: any; accessToken: string }> {
  const response = await api.post('/auth/first-login-change-password', {
    temporaryPassword,
    newPassword,
  });
  return response.data.data;
}
export interface DashboardStats {
  todayOrders: number;
  activeOrders: number;
  completedToday: number;
  todayRevenue: number;
}

export async function getShopDashboard(shopId: string): Promise<DashboardStats> {
  const response = await api.get(`/shops/${shopId}/dashboard`);
  return response.data.data;
}

export async function getShopOrders(
  shopId: string,
  params?: { status?: string; date?: string; search?: string; page?: number; limit?: number },
) {
  const response = await api.get(`/shops/${shopId}/orders`, { params });
  return response.data.data;
}

export async function confirmCounterPayment(shopId: string, orderId: string): Promise<void> {
  await api.post(`/shops/${shopId}/orders/${orderId}/counter-payment/confirm`);
}

export async function dispatchShopOrder(shopId: string, orderId: string): Promise<void> {
  await api.post(`/shops/${shopId}/orders/${orderId}/dispatch`);
}

export async function getShopTransactions(
  shopId: string,
  params?: { page?: number; limit?: number },
) {
  const response = await api.get(`/shops/${shopId}/transactions`, { params });
  return response.data.data;
}

export interface ShopQueueOrder {
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
  user?: { id: string; name: string; email: string };
}
export interface ShopQueueInfo {
  shopId: string;
  totalInQueue: number;
  averageWaitSeconds: number;
  orders: ShopQueueOrder[];
}
export async function getShopQueue(shopId: string): Promise<ShopQueueInfo> {
  const response = await api.get(`/shops/${shopId}/queue`);
  return response.data.data;
}

export interface PairingCodeResponse {
  pairingCode: string;
  shopId: string;
  shopName: string;
  expiresAt: string;
  validForMinutes: number;
}

export async function generatePairingCode(shopId: string): Promise<PairingCodeResponse> {
  const response = await api.post(`/shops/${shopId}/pairing-code`);
  return response.data.data;
}
