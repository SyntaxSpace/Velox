import { Request, Response, NextFunction } from 'express';
import { shopService } from '../services/shop.service';
import { sendSuccess } from '../utils/api-response';

export class ShopController {
  async getShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const shop = await shopService.getShopById(shopId);
      sendSuccess(res, shop, 'Shop retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const shopController = new ShopController();
