import { Request, Response, NextFunction } from 'express';
import { shopService } from '../services/shop.service';
import { queueService } from '../services/queue.service';
import { adminService } from '../services/admin.service';
import { paymentService } from '../services/payment.service';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../utils/app-error';

export class ShopController {
  // ─── Authenticated Owner Endpoints ─────────────────────────────────

  async createShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const shop = await shopService.createShop(req.user.userId, req.body);
      sendSuccess(res, shop, 'Shop created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getMyShops(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const shops = await shopService.getMyShops(req.user.userId);
      sendSuccess(res, shops, 'Shops retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const shop = await shopService.getShopById(shopId);
      sendSuccess(res, shop, 'Shop retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const { shopId } = req.params;
      const shop = await shopService.updateShop(shopId, req.user.userId, req.body, req.user.role);
      sendSuccess(res, shop, 'Shop updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Public Customer Endpoints ─────────────────────────────────────

  async getPublicShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publicShopId } = req.params;
      const shop = await shopService.getPublicShop(publicShopId);
      sendSuccess(res, shop, 'Public shop retrieved');
    } catch (error) {
      next(error);
    }
  }

  async createGuestSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publicShopId } = req.params;
      const session = await shopService.createGuestSession(publicShopId);
      sendSuccess(res, session, 'Guest customer session created', 201);
    } catch (error) {
      next(error);
    }
  }

  async getPublicShopQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publicShopId } = req.params;
      const shop = await shopService.getPublicShop(publicShopId);
      const queue = await queueService.getShopQueue(shop.id);
      sendSuccess(res, queue, 'Shop queue retrieved');
    } catch (error) {
      next(error);
    }
  }
  async getShopPrinters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const data = await adminService.getShopPrinters(shopId);
      sendSuccess(res, data, 'Printers retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getShopPricing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const shop = await shopService.getShopById(shopId);
      sendSuccess(
        res,
        {
          pricePerPageBW: shop.pricePerPageBW ?? 2.0,
          pricePerPageColor: shop.pricePerPageColor ?? 10.0,
          duplexDiscount: shop.duplexDiscount ?? 0.0,
        },
        'Shop pricing retrieved',
      );
    } catch (error) {
      next(error);
    }
  }

  async updatePricing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw AppError.unauthorized('Authentication required');
      }
      const { shopId } = req.params;
      const shop = await shopService.updatePricing(
        shopId,
        req.user.userId,
        req.user.role,
        req.body,
      );
      sendSuccess(res, shop, 'Shop pricing updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) throw AppError.unauthorized('Authentication required');
      const { shopId } = req.params;
      const data = await shopService.getShopDashboard(shopId, req.user.userId, req.user.role);
      sendSuccess(res, data, 'Shop dashboard retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) throw AppError.unauthorized('Authentication required');
      const { shopId } = req.params;
      const filters = {
        status: req.query.status as string,
        date: req.query.date as string,
        search: req.query.search as string,
      };
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const data = await shopService.getShopOrders(
        shopId,
        req.user.userId,
        req.user.role,
        filters,
        page,
        limit,
      );
      sendSuccess(res, data, 'Shop orders retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) throw AppError.unauthorized('Authentication required');
      const { shopId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const data = await shopService.getShopTransactions(
        shopId,
        req.user.userId,
        req.user.role,
        page,
        limit,
      );
      sendSuccess(res, data, 'Shop transactions retrieved');
    } catch (error) {
      next(error);
    }
  }

  async confirmCounterPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) throw AppError.unauthorized('Authentication required');
      const { shopId, orderId } = req.params;
      const result = await paymentService.confirmCounterPayment(orderId, shopId, req.user.userId);
      sendSuccess(
        res,
        result,
        result.alreadyConfirmed
          ? 'Counter payment was already confirmed'
          : 'Counter payment confirmed and order added to the queue',
      );
    } catch (error) {
      next(error);
    }
  }
}

export const shopController = new ShopController();
