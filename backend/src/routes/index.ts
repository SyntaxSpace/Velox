import { Router } from 'express';
import healthRouter from './health.route';

const router = Router();

router.use(healthRouter);

export default router;
