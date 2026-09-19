import { User, UserRole } from '@prisma/client';
import { prisma } from '../database/prisma';

export class AuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
    shopId?: string;
    phone?: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role ?? UserRole.CUSTOMER,
        shopId: data.shopId,
        phone: data.phone,
      },
    });
  }
}

export const authRepository = new AuthRepository();
