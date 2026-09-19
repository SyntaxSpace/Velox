import jwt from 'jsonwebtoken';
import { env } from './env';

export interface JwtPayload {
  userId?: string;
  email?: string;
  role: string;
  shopId?: string;
  deviceId?: string;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function generateAgentToken(payload: {
  deviceId: string;
  shopId: string;
  role?: string;
}): string {
  return jwt.sign({ ...payload, role: payload.role || 'AGENT' }, env.JWT_SECRET, {
    expiresIn: '30d',
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}
