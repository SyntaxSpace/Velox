import { Router } from 'express';
import healthRouter from './health.route';
import authRouter from './auth.routes';
import shopRouter from './shop.routes';
import orderRouter from './order.routes';
import adminRouter from './admin.routes';
import agentRouter from './agent.routes';
import publicRouter from './public.routes';
import partnerRouter from './partner.routes';
import devRouter from './dev.routes';
const router = Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/shops', shopRouter);
router.use('/orders', orderRouter);
router.use('/admin', adminRouter);
router.use('/agent', agentRouter);
router.use('/public', publicRouter);
router.use('/partner', partnerRouter);

// Development-only routes
if (process.env.NODE_ENV === 'development') {
  router.use('/dev', devRouter);
}

export default router;
