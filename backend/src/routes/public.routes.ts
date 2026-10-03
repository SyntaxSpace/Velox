import { Router } from 'express';
import { shopController } from '../controllers/shop.controller';
import { validate } from '../middlewares/validate';
import { publicShopIdParamSchema } from '../validators/shop.validator';

const router = Router();

// GET /public/shops/:publicShopId - Get public shop information
router.get(
  '/shops/:publicShopId',
  validate(publicShopIdParamSchema, 'params'),
  shopController.getPublicShop,
);

// POST /public/shops/:publicShopId/session - Issue a temporary guest customer session
router.post(
  '/shops/:publicShopId/session',
  validate(publicShopIdParamSchema, 'params'),
  shopController.createGuestSession,
);

// GET /public/shops/:publicShopId/queue - View public shop queue snapshot
router.get(
  '/shops/:publicShopId/queue',
  validate(publicShopIdParamSchema, 'params'),
  shopController.getPublicShopQueue,
);

export default router;
