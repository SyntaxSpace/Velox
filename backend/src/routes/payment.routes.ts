import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticateGuestOrUser } from '../middlewares/auth.middleware';

const router = Router();

// POST /payments/razorpay/create-order - Create Razorpay order for an existing Velox order
router.post(
  '/razorpay/create-order',
  authenticateGuestOrUser,
  paymentController.createRazorpayOrder,
);

// POST /payments/razorpay/verify - Verify payment signature, confirm payment, and queue order
router.post('/razorpay/verify', authenticateGuestOrUser, paymentController.verifyRazorpayPayment);

// POST /payments/razorpay/webhook - Asynchronous webhook confirmation from Razorpay
router.post('/razorpay/webhook', paymentController.handleWebhook);

export default router;
