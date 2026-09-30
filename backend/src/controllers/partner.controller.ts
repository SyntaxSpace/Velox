import { Request, Response, NextFunction } from 'express';
import { shopService } from '../services/shop.service';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../utils/app-error';

export class PartnerController {
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const stats = await shopService.getPartnerStats();
      sendSuccess(res, stats, 'Partner company stats retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getAllShops(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const shops = await shopService.getAllShopsForPartner();
      sendSuccess(res, shops, 'All Velox network shops retrieved');
    } catch (error) {
      next(error);
    }
  }

  async provisionShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const result = await shopService.provisionShop(req.user.userId, req.body);
      sendSuccess(res, result, 'Shop and Owner provisioned successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getShopDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const shop = await shopService.getShopById(shopId);
      sendSuccess(res, shop, 'Shop details retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const partnerController = new PartnerController();
