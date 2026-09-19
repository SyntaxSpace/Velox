import argon2 from 'argon2';
import { UserRole } from '@prisma/client';
import { authRepository } from '../repositories/auth.repository';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  JwtPayload,
} from '../config/jwt';
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger';

export class AuthService {
  async register(data: { name: string; email: string; password: string }) {
    const existing = await authRepository.findByEmail(data.email);
    if (existing) {
      throw AppError.conflict('Email already registered');
    }

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await authRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: UserRole.CUSTOMER,
    });

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    logger.info({ userId: user.id }, 'User registered');

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(data: { email: string; password: string }) {
    const user = await authRepository.findByEmail(data.email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const validPassword = await argon2.verify(user.passwordHash, data.password);
    if (!validPassword) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    logger.info({ userId: user.id }, 'User logged in');

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshTokenStr: string) {
    try {
      const payload = verifyRefreshToken(refreshTokenStr);
      if (!payload.userId) {
        throw AppError.unauthorized('Invalid refresh token');
      }

      const user = await authRepository.findById(payload.userId);
      if (!user) {
        throw AppError.unauthorized('User not found');
      }

      const newPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = generateAccessToken(newPayload);
      const newRefreshToken = generateRefreshToken(newPayload);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.unauthorized('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
      phone: user.phone,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
