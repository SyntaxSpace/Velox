import { Router } from 'express';
import { agentController } from '../controllers/agent.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Device login (public - device authenticates with shopId, deviceId, deviceKey)
router.post('/login', agentController.login);

// Protected agent endpoints (requires AGENT role or shop operator/owner)
router.use(authenticate);
router.use(authorize('AGENT', 'OPERATOR', 'OWNER', 'ADMIN'));

// HTTP Heartbeat fallback
router.post('/heartbeat', agentController.heartbeat);

// Printer synchronization
router.post('/printers', agentController.syncPrinters);

// Secure file download with SHA-256 checksum header
router.get('/orders/:orderId/file', agentController.downloadFile);

export default router;
