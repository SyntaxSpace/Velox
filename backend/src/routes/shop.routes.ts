import { Router } from 'express';
import { shopController } from '../controllers/shop.controller';
import { queueController } from '../controllers/queue.controller';
import { authenticate, authorize, requireShopOwner } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import {
  shopIdParamSchema,
  createShopBodySchema,
  updateShopBodySchema,
} from '../validators/shop.validator';

const router = Router();

// POST /shops - Create a new shop (Partner/Admin only per Day 8 business model)
router.post(
  '/',
  authenticate,
  authorize('PARTNER', 'ADMIN'),
  validate(createShopBodySchema, 'body'),
  shopController.createShop,
);

// GET /shops - Get all shops owned by the authenticated owner
router.get(
  '/',
  authenticate,
  authorize('SHOP_OWNER', 'OWNER', 'PARTNER', 'ADMIN'),
  shopController.getMyShops,
);

// GET /shops/:shopId - Get shop details (public / authenticated)
router.get('/:shopId', validate(shopIdParamSchema, 'params'), shopController.getShop);

// GET /shops/:shopId/pricing - Get shop pricing
router.get(
  '/:shopId/pricing',
  validate(shopIdParamSchema, 'params'),
  shopController.getShopPricing,
);

// PATCH /shops/:shopId/pricing - Update shop pricing (Shop Owner/Partner/Admin)
router.patch(
  '/:shopId/pricing',
  authenticate,
  requireShopOwner('shopId'),
  shopController.updatePricing,
);

// PATCH /shops/:shopId - Update shop configuration (Owner/Partner/Admin)
router.patch(
  '/:shopId',
  authenticate,
  requireShopOwner('shopId'),
  validate(updateShopBodySchema, 'body'),
  shopController.updateShop,
);

// GET /shops/:shopId/queue - Get shop queue
router.get('/:shopId/queue', validate(shopIdParamSchema, 'params'), queueController.getShopQueue);

// GET /shops/:shopId/printers - Get shop printers and devices (Owner/Partner/Admin)
router.get(
  '/:shopId/printers',
  authenticate,
  requireShopOwner('shopId'),
  shopController.getShopPrinters,
);

// GET /shops/:shopId/dashboard - Get shop owner KPIs
router.get(
  '/:shopId/dashboard',
  authenticate,
  requireShopOwner('shopId'),
  shopController.getDashboard,
);

// GET /shops/:shopId/orders - Get shop orders history
router.get('/:shopId/orders', authenticate, requireShopOwner('shopId'), shopController.getOrders);

// GET /shops/:shopId/transactions - Get shop transactions
router.get(
  '/:shopId/transactions',
  authenticate,
  requireShopOwner('shopId'),
  shopController.getTransactions,
);

export default router;
