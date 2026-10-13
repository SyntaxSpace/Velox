import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { env } from './config/env';
import { corsOptions } from './config/cors';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/error-handler';
import routes from './routes';
import { prisma } from './database/prisma';
import { initializeSocket } from './socket';
import { setSocketIO } from './services/order.service';
import { UPLOAD_DIR } from './config/upload';
import fs from 'fs';
import multer from 'multer';

// Support BigInt serialization for Prisma schema fields
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const app = express();

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Body parsing
app.use(cookieParser());
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// API routes
app.use('/api/v1', routes);

// Error handling — including Multer errors
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.',
        error: { code: 'FILE_TOO_LARGE' },
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      error: { code: 'UPLOAD_ERROR' },
    });
    return;
  }
  errorHandler(err, req, res, next);
});

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);
setSocketIO(io);

httpServer.listen(env.PORT, env.HOST, () => {
  logger.info(`🚀 Velox API server running on port ${env.PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 Health: http://localhost:${env.PORT}/api/v1/health`);
  logger.info(`🔌 Socket.IO ready`);

  // Scheduled worker: Server-side automatic document cleanup (every 60 seconds)
  import('./services/cleanup.service').then(({ cleanupService }) => {
    setInterval(async () => {
      try {
        const count = await cleanupService.cleanupExpiredFiles();
        if (count > 0) {
          logger.info({ cleanedFiles: count }, 'Server-side automatic file cleanup completed');
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'Error during server-side file cleanup');
      }
    }, 60000);
  });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  io.close();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, httpServer as server };
