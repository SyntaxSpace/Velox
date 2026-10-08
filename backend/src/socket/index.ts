import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { corsOptions } from '../config/cors';
import { logger } from '../config/logger';
import { verifyAccessToken } from '../config/jwt';
import { agentService } from '../services/agent.service';
import { queueService } from '../services/queue.service';
import { OrderStatus } from '@prisma/client';

let globalIo: SocketIOServer | null = null;
let globalAgentNamespace: any = null;

function tokenFromSocket(socket: Socket): string | undefined {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string') return authToken;

  const authorization = socket.handshake.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return authorization.slice('Bearer '.length);
  return undefined;
}

export async function isAgentConnected(deviceId: string): Promise<boolean> {
  if (!globalAgentNamespace) return false;
  const sockets = await globalAgentNamespace.in(`device:${deviceId}`).fetchSockets();
  return sockets.length > 0;
}

export function emitToAgentDevice(deviceId: string, event: string, data: any): void {
  if (globalAgentNamespace && deviceId) {
    globalAgentNamespace.to(`device:${deviceId}`).emit(event, data);
  }
}

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
    cors: corsOptions,
  });

  globalIo = io;
  // Agent namespace
  const agentNamespace = io.of('/agent');
  globalAgentNamespace = agentNamespace;

  // Agent sockets must carry the device token issued by /agent/login.
  agentNamespace.use((socket, next) => {
    const token = tokenFromSocket(socket);

    if (!token) {
      next(new Error('Agent authentication required'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      if (payload.role !== 'AGENT' || !payload.shopId || !payload.deviceId) {
        next(new Error('A valid device token is required'));
        return;
      }
      socket.data.user = payload;
      next();
    } catch (err) {
      logger.warn({ socketId: socket.id }, 'Agent socket auth invalid token');
      next(new Error('Invalid or expired agent token'));
    }
  });

  agentNamespace.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'Agent connected to /agent namespace');

    // Handle agent authentication / registration handshake
    socket.on(
      'agent.register',
      async (data: { shopId: string; deviceId: string; token?: string }) => {
        try {
          const payload = socket.data.user;
          if (
            !payload ||
            !data ||
            data.shopId !== payload.shopId ||
            data.deviceId !== payload.deviceId ||
            (data.token && data.token !== tokenFromSocket(socket))
          ) {
            logger.warn({ socketId: socket.id }, 'Agent registration did not match its token');
            socket.emit('agent.error', { message: 'Device registration does not match its token' });
            socket.disconnect(true);
            return;
          }

          const shopId = payload.shopId as string;
          const deviceId = payload.deviceId as string;

          await agentService.recordHeartbeat(shopId, deviceId);
          socket.data.shopId = shopId;
          socket.data.deviceId = deviceId;
          socket.data.registered = true;

          // Join shop room and dedicated device room
          socket.join(`shop:${shopId}`);
          socket.join(`device:${deviceId}`);
          if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
            socket.join('all-dev-shops');
          }

          logger.info(
            { socketId: socket.id, shopId, deviceId },
            'Agent registered and joined rooms',
          );

          socket.emit('agent.registered', { success: true, shopId, deviceId });
        } catch (err: any) {
          logger.error({ err: err.message }, 'Error in agent.register handler');
          socket.emit('agent.error', { message: 'Agent registration failed' });
          socket.disconnect(true);
        }
      },
    );

    // Agent Heartbeat (every 30s)
    socket.on('agent.heartbeat', async () => {
      const shopId = socket.data.registered ? socket.data.shopId : undefined;
      const deviceId = socket.data.registered ? socket.data.deviceId : undefined;

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
        const shopId = socket.data.registered ? socket.data.shopId : undefined;
        const deviceId = socket.data.registered ? socket.data.deviceId : undefined;

        if (!shopId || !deviceId) {
          logger.warn(
            { socketId: socket.id },
            'Received agent.printers before registration completed',
          );
          socket.emit('agent.printers.error', {
            message: 'Agent registration required before printer sync',
          });
          return;
        }

        if (!data || !Array.isArray(data.printers)) {
          logger.warn({ socketId: socket.id }, 'Invalid printers payload format');
          socket.emit('agent.printers.error', {
            message: 'Invalid printers payload format',
          });
          return;
        }

        try {
          const synced = await agentService.syncPrinters(shopId, deviceId, data.printers);
          socket.emit('agent.printers.synced', {
            count: synced.synced,
            shopId,
            deviceId,
          });
          logger.info(
            { shopId, deviceId, count: synced.synced },
            'Printers synchronized successfully via WebSocket',
          );
        } catch (e: any) {
          logger.error({ err: e.message, shopId, deviceId }, 'Failed to sync printers from socket');
          socket.emit('agent.printers.error', {
            message: e.message || 'Failed to sync printers',
          });
        }
      },
    );

    // Job Lifecycle Events reported by Agent
    socket.on('job.received', (data: { orderId: string }) => {
      if (socket.data.registered) {
        logger.info({ orderId: data.orderId, socketId: socket.id }, 'Agent received job');
      }
    });

    socket.on('job.downloading', async (data: { orderId: string }) => {
      if (!socket.data.registered) return;
      try {
        await queueService.transitionOrder(
          data.orderId,
          OrderStatus.DOWNLOADING,
          socket.data.shopId,
        );
        logger.info({ orderId: data.orderId }, 'Order transitioned to DOWNLOADING');
      } catch (e: any) {
        logger.error(
          { err: e.message, orderId: data.orderId },
          'Failed to transition to DOWNLOADING',
        );
      }
    });

    socket.on('job.ready', (data: { orderId: string }) => {
      if (socket.data.registered) {
        logger.info({ orderId: data.orderId }, 'Agent verified file and is ready to print');
      }
    });

    socket.on('job.printing', async (data: { orderId: string }) => {
      if (!socket.data.registered) return;
      try {
        await queueService.transitionOrder(data.orderId, OrderStatus.PRINTING, socket.data.shopId);
        logger.info({ orderId: data.orderId }, 'Order transitioned to PRINTING');
      } catch (e: any) {
        logger.error({ err: e.message, orderId: data.orderId }, 'Failed to transition to PRINTING');
      }
    });

    socket.on('job.completed', async (data: { orderId: string }) => {
      if (!socket.data.registered) return;
      try {
        await queueService.transitionOrder(data.orderId, OrderStatus.COMPLETED, socket.data.shopId);
        logger.info({ orderId: data.orderId }, 'Order transitioned to COMPLETED');
      } catch (e: any) {
        logger.error(
          { err: e.message, orderId: data.orderId },
          'Failed to transition to COMPLETED',
        );
      }
    });

    socket.on('job.failed', async (data: { orderId: string; error?: string }) => {
      if (!socket.data.registered) return;
      try {
        await queueService.transitionOrder(data.orderId, OrderStatus.FAILED, socket.data.shopId);
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
