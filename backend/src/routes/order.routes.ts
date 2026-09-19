import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { queueController } from '../controllers/queue.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { upload } from '../config/upload';
import {
  createOrderBodySchema,
  orderIdParamSchema,
  cancelOrderParamSchema,
} from '../validators/order.validator';

const router = Router();

// POST /orders - Create order with file upload (authenticated)
router.post(
  '/',
  authenticate,
  upload.single('file'),
  validate(createOrderBodySchema, 'body'),
  orderController.createOrder,
);

// GET /orders/:orderId - Get order by ID (authenticated)
router.get(
  '/:orderId',
  authenticate,
  validate(orderIdParamSchema, 'params'),
  orderController.getOrder,
);

// GET /orders/:orderId/status - Get order status (authenticated)
router.get(
  '/:orderId/status',
  authenticate,
  validate(orderIdParamSchema, 'params'),
  queueController.getOrderStatus,
);

// GET /orders/:orderId/queue - Get order queue position (authenticated)
router.get(
  '/:orderId/queue',
  authenticate,
  validate(orderIdParamSchema, 'params'),
  queueController.getOrderQueue,
);

// PATCH /orders/:orderId/cancel - Cancel order (authenticated)
router.patch(
  '/:orderId/cancel',
  authenticate,
  validate(cancelOrderParamSchema, 'params'),
  queueController.cancelOrder,
);

export default router;
