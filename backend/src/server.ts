import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/error-handler';
import routes from './routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// API routes
app.use('/api/v1', routes);

// Error handling
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Velox API server running on port ${env.PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 Health: http://localhost:${env.PORT}/api/v1/health`);
});

export { app, server };
