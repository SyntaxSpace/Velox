import { shopRepository, ShopWithPrinters } from '../repositories/shop.repository';
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger';

export interface ShopResponse {
  id: string;
  name: string;
  qrCode: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  printers: Array<{
    id: string;
    name: string;
    printerType: string;
    status: string;
    pagesPerMinute: number;
  }>;
  estimatedWait: number;
}

export class ShopService {
  async getShopById(shopId: string): Promise<ShopResponse> {
    const shop = await shopRepository.findById(shopId);
    if (!shop) {
      throw AppError.notFound('Shop not found');
    }

    logger.info({ shopId: shop.id, shopName: shop.name }, 'Shop retrieved');

    return this.formatShopResponse(shop);
  }

  private formatShopResponse(shop: ShopWithPrinters): ShopResponse {
    return {
      id: shop.id,
      name: shop.name,
      qrCode: shop.qrCode,
      address: shop.address,
      phone: shop.phone,
      email: shop.email,
      status: shop.status,
      printers: shop.printers.map((p) => ({
        id: p.id,
        name: p.name,
        printerType: p.printerType,
        status: p.status,
        pagesPerMinute: p.pagesPerMinute,
      })),
      estimatedWait: 0, // Placeholder — Queue Engine not implemented yet
    };
  }
}

export const shopService = new ShopService();
