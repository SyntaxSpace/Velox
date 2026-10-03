import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { queueController } from '../controllers/queue.controller';
import { authenticateGuestOrUser } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { upload } from '../config/upload';
import {
  createOrderBodySchema,
  orderIdParamSchema,
  cancelOrderParamSchema,
} from '../validators/order.validator';

const router = Router();

// POST /orders - Create order with file upload (supports registered user OR guest customer)
router.post(
  '/',
  authenticateGuestOrUser,
  upload.single('file'),
  validate(createOrderBodySchema, 'body'),
  orderController.createOrder,
);

// GET /orders/:orderId - Get order by ID (verifies ownership)
router.get(
  '/:orderId',
  authenticateGuestOrUser,
  validate(orderIdParamSchema, 'params'),
  orderController.getOrder,
);

// GET /orders/:orderId/status - Get order status (verifies ownership)
router.get(
  '/:orderId/status',
  authenticateGuestOrUser,
  validate(orderIdParamSchema, 'params'),
  queueController.getOrderStatus,
);

// GET /orders/:orderId/queue - Get order queue position (verifies ownership)
router.get(
  '/:orderId/queue',
  authenticateGuestOrUser,
  validate(orderIdParamSchema, 'params'),
  queueController.getOrderQueue,
);

// PATCH /orders/:orderId/cancel - Cancel order (verifies ownership)
router.patch(
  '/:orderId/cancel',
  authenticateGuestOrUser,
  validate(cancelOrderParamSchema, 'params'),
  queueController.cancelOrder,
);

export default router;
