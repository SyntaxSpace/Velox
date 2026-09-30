import { Router, Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { isAgentGatewayRunning } from '../socket';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  const gatewayStatus = isAgentGatewayRunning() ? 'running' : 'stopped';

  res.status(200).json({
    success: true,
    message: 'Velox API is healthy',
    data: {
      status: 'ok',
      database: dbStatus,
      agentGateway: gatewayStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;
