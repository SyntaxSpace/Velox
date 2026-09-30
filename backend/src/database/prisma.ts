import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
});

export let isDbOffline = false;
export function setDbOffline(offline: boolean) {
  isDbOffline = offline;
}

prisma.$on('query', (e) => {
  logger.debug(`Query: ${e.query}`);
});

prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`);
  if (e.message.includes("Can't reach database server")) {
    isDbOffline = true;
  }
});

prisma.$on('info', (e) => {
  logger.info(`Prisma Info: ${e.message}`);
});

prisma.$on('warn', (e) => {
  logger.warn(`Prisma Warn: ${e.message}`);
});

logger.info('Database connected');
