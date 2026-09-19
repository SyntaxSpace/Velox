import { api } from '@/lib/api';

export interface CreateOrderResponse {
  orderId: string;
  orderCode: string;
  status: string;
  totalPages: number;
  estimatedCost: number;
}

export interface OrderData {
  id: string;
  orderCode: string;
  userId: string;
  shopId: string;
  totalPages: number;
  totalPrice: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  files: Array<{
    id: string;
    filename: string;
    pageCount: number;
    size: number;
    mimeType: string;
  }>;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export async function createOrder(
  formData: FormData,
  onUploadProgress?: (progress: number) => void,
): Promise<CreateOrderResponse> {
  const response = await api.post('/orders', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total && onUploadProgress) {
        const progress = Math.round((event.loaded * 100) / event.total);
        onUploadProgress(progress);
      }
    },
  });
  return response.data.data;
}

export async function getOrder(orderId: string): Promise<OrderData> {
  const response = await api.get(`/orders/${orderId}`);
  return response.data.data;
}

export interface OrderStatusData {
  id: string;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  totalPages: number;
  totalPrice: string;
  copies: number;
  color: string;
  doubleSided: boolean;
  orientation: string;
  paperSize: string;
  estimatedWaitSeconds: number;
  queuePosition: number;
  peopleAhead: number;
  createdAt: string;
  files: Array<{ id: string; filename: string; pageCount: number; mimeType: string }>;
  events: Array<{ id: string; event: string; createdAt: string }>;
}

export interface QueuePositionData {
  queuePosition: number;
  peopleAhead: number;
  estimatedWaitSeconds: number;
  totalInQueue: number;
}

export async function getOrderStatus(orderId: string): Promise<OrderStatusData> {
  const response = await api.get(`/orders/${orderId}/status`);
  return response.data.data;
}

export async function getOrderQueue(orderId: string): Promise<QueuePositionData> {
  const response = await api.get(`/orders/${orderId}/queue`);
  return response.data.data;
}

export async function cancelOrder(orderId: string): Promise<void> {
  await api.patch(`/orders/${orderId}/cancel`);
}

export async function simulatePayment(orderId: string): Promise<void> {
  await api.post(`/dev/payment/${orderId}/success`);
}
