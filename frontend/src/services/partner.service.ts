import { api } from '@/lib/api';
import { ShopData } from './shop.service';

export interface PartnerStats {
  totalShops: number;
  activeShops: number;
  inactiveShops: number;
  totalOrdersToday: number;
  totalRevenueToday: number;
}

export interface ProvisionShopInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  operatingHours?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  temporaryPassword?: string;
  pricePerPageBW?: number;
  pricePerPageColor?: number;
  duplexDiscount?: number;
}

export interface ProvisionShopResponse {
  shop: ShopData;
  owner: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role: string;
    firstLogin: boolean;
    temporaryPassword?: string;
  };
  temporaryPassword?: string;
}

export async function getPartnerStats(): Promise<PartnerStats> {
  const response = await api.get('/partner/stats');
  return response.data.data;
}

export async function getAllShops(): Promise<ShopData[]> {
  const response = await api.get('/partner/shops');
  return response.data.data;
}

export async function provisionShop(input: ProvisionShopInput): Promise<ProvisionShopResponse> {
  const response = await api.post('/partner/shops', input);
  return response.data.data;
}

export async function getShopDetails(shopId: string): Promise<ShopData> {
  const response = await api.get(`/partner/shops/${shopId}`);
  return response.data.data;
}
