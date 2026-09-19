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
  name: string;
  qrCode: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  printers: ShopPrinter[];
  estimatedWait: number;
}

export async function getShop(shopId: string): Promise<ShopData> {
  const response = await api.get(`/shops/${shopId}`);
  return response.data.data;
}
