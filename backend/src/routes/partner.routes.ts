import { Router } from 'express';
import { partnerController } from '../controllers/partner.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { provisionShopBodySchema, shopIdParamSchema } from '../validators/shop.validator';

const router = Router();

// Protect all partner routes: must be authenticated and have role PARTNER or ADMIN
router.use(authenticate);
router.use(authorize('PARTNER', 'ADMIN'));

// GET /api/v1/partner/stats - Company-level network statistics
router.get('/stats', partnerController.getStats);

// GET /api/v1/partner/shops - View all shops in Velox network
router.get('/shops', partnerController.getAllShops);

// POST /api/v1/partner/shops - Provision a new shop + shop owner account
router.post('/shops', validate(provisionShopBodySchema, 'body'), partnerController.provisionShop);

// GET /api/v1/partner/shops/:shopId - View shop details
router.get('/:shopId', validate(shopIdParamSchema, 'params'), partnerController.getShopDetails);

export default router;
