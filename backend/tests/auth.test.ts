import { describe, it, expect } from 'vitest';
import argon2 from 'argon2';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/config/jwt';

describe('Auth & Security Services', () => {
  describe('JWT Token Generation and Verification', () => {
    const payload = {
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'test@velox.dev',
      role: 'CUSTOMER',
    };

    it('should generate and verify a valid access token', () => {
      const token = generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const verified = verifyAccessToken(token);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
      expect(verified.role).toBe(payload.role);
    });

    it('should generate and verify a valid refresh token', () => {
      const token = generateRefreshToken(payload);
      expect(token).toBeDefined();

      const verified = verifyRefreshToken(token);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
      expect(verified.role).toBe(payload.role);
    });

    it('should throw error for invalid or tampered access token', () => {
      expect(() => verifyAccessToken('invalid.jwt.token')).toThrow();
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid.jwt.token')).toThrow();
    });
  });

  describe('Argon2id Password Hashing', () => {
    it('should securely hash password and verify matching password', async () => {
      const password = 'SecurePassword123!';
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      expect(hash).toBeDefined();
      expect(hash.startsWith('$argon2id$')).toBe(true);

      const isMatch = await argon2.verify(hash, password);
      expect(isMatch).toBe(true);

      const isWrongMatch = await argon2.verify(hash, 'WrongPassword!');
      expect(isWrongMatch).toBe(false);
    });
  });
});
