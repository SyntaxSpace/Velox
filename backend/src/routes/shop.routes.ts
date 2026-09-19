import { Router } from 'express';
import { shopController } from '../controllers/shop.controller';
import { queueController } from '../controllers/queue.controller';
import { validate } from '../middlewares/validate';
import { shopIdParamSchema } from '../validators/shop.validator';

const router = Router();

// GET /shops/:shopId - Public endpoint (no auth required for QR scanning)
router.get('/:shopId', validate(shopIdParamSchema, 'params'), shopController.getShop);

// GET /shops/:shopId/queue - Get shop queue (public)
router.get('/:shopId/queue', validate(shopIdParamSchema, 'params'), queueController.getShopQueue);

export default router;
