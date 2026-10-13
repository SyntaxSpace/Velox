import { api } from '@/lib/api';

export interface CreateRazorpayOrderResponse {
  orderId: string;
  orderCode: string;
  razorpayOrderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
}

export interface VerifyRazorpayPaymentResponse {
  orderId: string;
  orderStatus: string;
  alreadyConfirmed: boolean;
  dispatched: boolean;
}

export async function createRazorpayOrder(orderId: string): Promise<CreateRazorpayOrderResponse> {
  const response = await api.post('/payments/razorpay/create-order', { orderId });
  return response.data.data;
}

export async function verifyRazorpayPayment(payload: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<VerifyRazorpayPaymentResponse> {
  const response = await api.post('/payments/razorpay/verify', payload);
  return response.data.data;
}
