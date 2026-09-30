import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { verifyAccessToken } from '../config/jwt';
import { agentService } from '../services/agent.service';
import { queueService } from '../services/queue.service';
import { OrderStatus } from '@prisma/client';

let globalIo: SocketIOServer | null = null;
let globalAgentNamespace: any = null;

export function emitToAgentShop(shopId: string, event: string, data: any): void {
  if (globalAgentNamespace) {
    if (shopId) {
      globalAgentNamespace.to(`shop:${shopId}`).emit(event, data);
    } else {
      globalAgentNamespace.to('all-dev-shops').emit(event, data);
    }
  }
}

export function emitToClientShop(shopId: string, event: string, data: any): void {
  if (globalIo) {
    globalIo.to(`shop:${shopId}`).emit(event, data);
  }
}

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  globalIo = io;
  // Agent namespace
  const agentNamespace = io.of('/agent');
  globalAgentNamespace = agentNamespace;

  // Authenticate socket connections on /agent namespace
  agentNamespace.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        if (payload.role === 'AGENT' || payload.role === 'OPERATOR' || payload.role === 'OWNER') {
          socket.data.user = payload;
          return next();
        }
      } catch (err) {
        logger.warn({ socketId: socket.id }, 'Agent socket auth invalid token');
      }
    }

    // Allow connection but require explicit 'agent.auth' or 'agent.register' handshake
    next();
  });

  agentNamespace.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'Agent connected to /agent namespace');

    // Handle agent authentication / registration handshake
    socket.on(
      'agent.register',
      async (data: { shopId: string; deviceId: string; token?: string }) => {
        try {
          let shopId = data.shopId;
          let deviceId = data.deviceId;

          // If token provided, verify it
          if (data.token) {
            try {
              const payload = verifyAccessToken(data.token);
              if (payload.shopId && payload.shopId !== shopId) {
                logger.warn(
                  { socketId: socket.id, shopId, tokenShopId: payload.shopId },
                  'Shop mismatch in agent register',
                );
                socket.emit('agent.error', { message: 'Shop ID does not match token' });
                return;
              }
              if (payload.deviceId) deviceId = payload.deviceId;
            } catch (e) {
              logger.warn({ socketId: socket.id }, 'Invalid token in agent.register');
              socket.emit('agent.error', { message: 'Invalid token' });
              return;
            }
          }

          socket.data.shopId = shopId;
          socket.data.deviceId = deviceId;

          // Join shop room and dedicated device room
          socket.join(`shop:${shopId}`);
          socket.join(`device:${deviceId}`);
          if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
            socket.join('all-dev-shops');
          }

          // Update device heartbeat in DB
          await agentService.recordHeartbeat(shopId, deviceId).catch(() => {});

          logger.info(
            { socketId: socket.id, shopId, deviceId },
            'Agent registered and joined rooms',
          );

          socket.emit('agent.registered', { success: true, shopId, deviceId });
        } catch (err: any) {
          logger.error({ err: err.message }, 'Error in agent.register handler');
        }
      },
    );

    // Agent Heartbeat (every 30s)
    socket.on('agent.heartbeat', async (data: { shopId?: string; deviceId?: string }) => {
      const shopId = data?.shopId || socket.data.shopId;
      const deviceId = data?.deviceId || socket.data.deviceId;

      if (shopId && deviceId) {
        try {
          await agentService.recordHeartbeat(shopId, deviceId);
          logger.debug({ shopId, deviceId }, 'Heartbeat recorded via WebSocket');
          socket.emit('agent.heartbeat.ack', { timestamp: new Date() });
        } catch (e: any) {
          logger.warn({ err: e.message }, 'Failed to record agent heartbeat');
        }
      }
    });

    // Sync Printers from Agent
    socket.on(
      'agent.printers',
      async (data: { shopId?: string; deviceId?: string; printers: any[] }) => {
        const shopId = data?.shopId || socket.data.shopId;
        const deviceId = data?.deviceId || socket.data.deviceId;

        if (shopId && deviceId && data.printers) {
          try {
            const synced = await agentService.syncPrinters(shopId, deviceId, data.printers);
            socket.emit('agent.printers.synced', { count: synced.synced });
          } catch (e: any) {
            logger.error({ err: e.message }, 'Failed to sync printers from socket');
          }
        }
      },
    );

    // Job Lifecycle Events reported by Agent
    socket.on('job.received', (data: { orderId: string }) => {
      logger.info({ orderId: data.orderId, socketId: socket.id }, 'Agent received job');
    });

    socket.on('job.downloading', async (data: { orderId: string }) => {
      try {
        await queueService.transitionOrder(data.orderId, OrderStatus.DOWNLOADING);
        logger.info({ orderId: data.orderId }, 'Order transitioned to DOWNLOADING');
      } catch (e: any) {
        logger.error(
          { err: e.message, orderId: data.orderId },
          'Failed to transition to DOWNLOADING',
        );
      }
    });

    socket.on('job.ready', (data: { orderId: string }) => {
      logger.info({ orderId: data.orderId }, 'Agent verified file and is ready to print');
    });

    socket.on('job.printing', async (data: { orderId: string }) => {
      try {
        await queueService.transitionOrder(data.orderId, OrderStatus.PRINTING);
        logger.info({ orderId: data.orderId }, 'Order transitioned to PRINTING');
      } catch (e: any) {
        logger.error({ err: e.message, orderId: data.orderId }, 'Failed to transition to PRINTING');
      }
    });

    socket.on('job.completed', async (data: { orderId: string }) => {
      try {
        await queueService.transitionOrder(data.orderId, OrderStatus.COMPLETED);
        logger.info({ orderId: data.orderId }, 'Order transitioned to COMPLETED');
      } catch (e: any) {
        logger.error(
          { err: e.message, orderId: data.orderId },
          'Failed to transition to COMPLETED',
        );
      }
    });

    socket.on('job.failed', async (data: { orderId: string; error?: string }) => {
      try {
        await queueService.transitionOrder(data.orderId, OrderStatus.FAILED);
        logger.warn({ orderId: data.orderId, error: data.error }, 'Order transitioned to FAILED');
      } catch (e: any) {
        logger.error({ err: e.message, orderId: data.orderId }, 'Failed to transition to FAILED');
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(
        { socketId: socket.id, reason, deviceId: socket.data.deviceId },
        'Agent disconnected',
      );
    });
  });

  // Default namespace for dashboard/admin/customer clients
  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'Client connected to default namespace');

    socket.on('join.shop', (shopId: string) => {
      socket.join(`shop:${shopId}`);
      logger.info({ socketId: socket.id, shopId }, 'Client joined shop room');
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Client disconnected');
    });
  });

  // Background monitor: Check stale agent devices every 30 seconds (offline threshold = 90s)
  setInterval(async () => {
    try {
      const offlineCount = await agentService.checkStaleDevices(90);
      if (offlineCount > 0) {
        logger.info({ offlineCount }, 'Marked stale agent devices as OFFLINE');
      }
    } catch (e: any) {
      logger.error({ err: e.message }, 'Error in stale device check');
    }
  }, 30000);

  logger.info('Socket.IO initialized with Agent and Default gateways');
  return io;
}

export function isAgentGatewayRunning(): boolean {
  return globalAgentNamespace !== null;
}
