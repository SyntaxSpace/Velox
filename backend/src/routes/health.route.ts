import { Router, Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { isAgentGatewayRunning } from '../socket';
import { env } from '../config/env';

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

  const isReady = dbStatus === 'connected';
  const statusCode = env.NODE_ENV === 'production' && !isReady ? 503 : 200;

  res.status(statusCode).json({
    success: true,
    message: isReady ? 'Velox API is healthy' : 'Velox API is waiting for the database',
    data: {
      status: isReady ? 'ok' : 'degraded',
      database: dbStatus,
      agentGateway: gatewayStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    },
  });
});

export default router;
