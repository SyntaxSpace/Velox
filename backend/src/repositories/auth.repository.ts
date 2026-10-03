import { User, UserRole } from '@prisma/client';
import { prisma, isDbOffline } from '../database/prisma';
import crypto from 'crypto';

export const devUsers = new Map<string, User>([
  [
    'dev-partner-id',
    {
      id: 'dev-partner-id',
      name: 'Velox Central Partner',
      email: 'partner@velox.dev',
      passwordHash:
        '$argon2id$v=19$m=65536,t=3,p=4$zYBChqySmbku4VzLkf2G2g$Bqas6vFKHiD5oKvmVlW3B82zqz+mnDhbM3Mlf2z2QGg', // PartnerSecure2026!
      role: 'PARTNER' as UserRole,
      shopId: null,
      phone: '+91 99999 00000',
      firstLogin: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ],
  [
    'dev-admin-id',
    {
      id: 'dev-admin-id',
      name: 'Velox Admin',
      email: 'admin@velox.dev',
      passwordHash:
        '$argon2id$v=19$m=65536,t=3,p=4$hxq98nxWMjTxVhoTVR4OmA$B9gzbtWBO7SPMW9bHAG/yfyt5BVfrpb5qWsxJnsRMdE', // AdminSecure2026!
      role: 'ADMIN' as UserRole,
      shopId: 'demo-shop-id',
      phone: '+91 99999 11111',
      firstLogin: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ],
]);

export class AuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    if (isDbOffline) {
      for (const u of devUsers.values()) {
        if (u.email === email) return u;
      }
      return null;
    }
    try {
      return await prisma.user.findUnique({ where: { email } });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        for (const u of devUsers.values()) {
          if (u.email === email) return u;
        }
        return null;
      }
      throw err;
    }
  }

  async findById(id: string): Promise<User | null> {
    if (isDbOffline) {
      return devUsers.get(id) || null;
    }
    try {
      return await prisma.user.findUnique({ where: { id } });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return devUsers.get(id) || null;
      }
      throw err;
    }
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
    shopId?: string;
    phone?: string;
    firstLogin?: boolean;
  }): Promise<User> {
    if (isDbOffline) {
      const user: User = {
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role ?? UserRole.CUSTOMER,
        shopId: data.shopId ?? null,
        phone: data.phone ?? null,
        firstLogin: data.firstLogin ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      devUsers.set(user.id, user);
      return user;
    }
    try {
      return await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role ?? UserRole.CUSTOMER,
          shopId: data.shopId,
          phone: data.phone,
          firstLogin: data.firstLogin ?? false,
        },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const user: User = {
          id: crypto.randomUUID(),
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role ?? UserRole.CUSTOMER,
          shopId: data.shopId ?? null,
          phone: data.phone ?? null,
          firstLogin: data.firstLogin ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        devUsers.set(user.id, user);
        return user;
      }
      throw err;
    }
  }

  async updatePasswordAndFirstLogin(
    id: string,
    passwordHash: string,
    firstLogin: boolean,
  ): Promise<User> {
    if (isDbOffline) {
      const user = devUsers.get(id);
      if (!user) throw new Error('User not found');
      user.passwordHash = passwordHash;
      user.firstLogin = firstLogin;
      user.updatedAt = new Date();
      return user;
    }
    try {
      return await prisma.user.update({
        where: { id },
        data: { passwordHash, firstLogin },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const user = devUsers.get(id);
        if (!user) throw new Error('User not found');
        user.passwordHash = passwordHash;
        user.firstLogin = firstLogin;
        user.updatedAt = new Date();
        return user;
      }
      throw err;
    }
  }
}

export const authRepository = new AuthRepository();
