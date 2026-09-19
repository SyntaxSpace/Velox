import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { orderIdParamSchema, transitionOrderBodySchema } from '../validators/order.validator';

const router = Router();

// All admin routes require auth + OWNER/OPERATOR role
router.use(authenticate);
router.use(authorize('OWNER', 'OPERATOR', 'ADMIN'));

// GET /admin/stats
router.get('/stats', adminController.getStats);

// GET /admin/orders
router.get('/orders', adminController.getOrders);

// GET /admin/orders/today
router.get('/orders/today', adminController.getTodayOrders);

// GET /admin/queue - Get shop queue
router.get('/queue', adminController.getQueueOrders);

// GET /admin/printers - Get shop printers & devices
router.get('/printers', adminController.getPrinters);

// PATCH /admin/printers/:printerId/status - Update printer status
router.patch('/printers/:printerId/status', adminController.updatePrinterStatus);

// PATCH /admin/orders/:orderId/status - Transition order status
router.patch(
  '/orders/:orderId/status',
  validate(orderIdParamSchema, 'params'),
  validate(transitionOrderBodySchema, 'body'),
  adminController.updateOrderStatus,
);

export default router;
