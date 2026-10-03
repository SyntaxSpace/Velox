import crypto from 'crypto';
import argon2 from 'argon2';
import { UserRole } from '@prisma/client';
import { shopRepository, ShopWithPrinters } from '../repositories/shop.repository';
import { authRepository } from '../repositories/auth.repository';
import { orderRepository } from '../repositories/order.repository';
import { generateGuestToken } from '../config/jwt';
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger';
import { CreateShopBody, UpdateShopBody } from '../validators/shop.validator';

export interface ShopResponse {
  id: string;
  publicShopId: string;
  name: string;
  createdByPartnerId?: string | null;
  ownerId: string | null;
  qrCode: string;
  address: string | null;
  city: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  operatingHours: string | null;
  status: string;
  pricePerPageBW?: number;
  pricePerPageColor?: number;
  duplexDiscount?: number;
  printers: Array<{
    id: string;
    name: string;
    printerType: string;
    status: string;
    pagesPerMinute: number;
  }>;
  estimatedWait: number;
}

export interface GuestSessionResponse {
  sessionToken: string;
  guestSessionId: string;
  shopId: string;
  publicShopId: string;
  expiresAt: string;
}

export interface ProvisionShopData {
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  temporaryPassword?: string;
  ownerPassword?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  operatingHours?: string;
  pricePerPageBW?: number;
  pricePerPageColor?: number;
  duplexDiscount?: number;
}

export class ShopService {
  /**
   * Velox Partner provisions a new shop and its owner account atomically.
   */
  async provisionShop(partnerId: string, data: ProvisionShopData) {
    const existingUser = await authRepository.findByEmail(data.ownerEmail);
    if (existingUser) {
      throw AppError.conflict('An account with this owner email already exists');
    }

    const rawPass = data.temporaryPassword || data.ownerPassword;
    const tempPassword =
      rawPass && rawPass.length >= 6 ? rawPass : `Vlx!${crypto.randomBytes(4).toString('hex')}89`;

    const passwordHash = await argon2.hash(tempPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 1. Create the Shop Owner user with firstLogin = true
    const owner = await authRepository.create({
      name: data.ownerName,
      email: data.ownerEmail,
      phone: data.ownerPhone || data.phone,
      passwordHash,
      role: UserRole.SHOP_OWNER,
      firstLogin: true,
    });

    // 2. Generate slug and QR
    const publicShopId = this.generatePublicShopId();
    const qrCode = `velox:shop:${publicShopId}`;

    // 3. Create Shop bound to Owner and Partner
    const shop = await shopRepository.create({
      name: data.name,
      publicShopId,
      ownerId: owner.id,
      createdByPartnerId: partnerId,
      qrCode,
      phone: data.phone || data.ownerPhone || '0000000000',
      address: data.address || '',
      city: data.city || '',
      pincode: data.pincode || '',
      operatingHours: data.operatingHours || '9:00 AM - 9:00 PM',
      email: data.email || data.ownerEmail,
      pricePerPageBW: data.pricePerPageBW ?? 2.0,
      pricePerPageColor: data.pricePerPageColor ?? 10.0,
      duplexDiscount: data.duplexDiscount ?? 0.0,
    });

    // 4. Bind owner to shopId
    owner.shopId = shop.id;

    logger.info(
      { shopId: shop.id, ownerId: owner.id, partnerId, publicShopId },
      'Shop and Owner provisioned successfully by Velox Partner',
    );

    return {
      shop: this.formatShopResponse(shop),
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        role: owner.role,
        firstLogin: true,
        temporaryPassword: tempPassword,
      },
      temporaryPassword: tempPassword,
    };
  }

  /**
   * For backward compatibility / existing owner tests
   */
  async createShop(ownerId: string, data: CreateShopBody): Promise<ShopResponse> {
    const publicShopId = this.generatePublicShopId();
    const qrCode = `velox:shop:${publicShopId}`;

    const shop = await shopRepository.create({
      name: data.name,
      publicShopId,
      ownerId,
      qrCode,
      phone: data.phone,
      address: data.address,
      city: data.city,
      pincode: data.pincode,
      operatingHours: data.operatingHours,
      email: data.email,
    });

    logger.info(
      { shopId: shop.id, publicShopId: shop.publicShopId, ownerId },
      'Shop created successfully',
    );

    return this.formatShopResponse(shop);
  }

  async getAllShopsForPartner(): Promise<ShopResponse[]> {
    const shops = await shopRepository.findAll();
    return shops.map((s) => this.formatShopResponse(s));
  }

  async getPartnerStats(): Promise<{
    totalShops: number;
    activeShops: number;
    inactiveShops: number;
    totalOrdersToday: number;
    totalRevenueToday: number;
  }> {
    const shops = await shopRepository.findAll();
    const totalShops = shops.length;
    const activeShops = shops.filter((s) => s.status === 'ACTIVE').length;
    const inactiveShops = totalShops - activeShops;

    let totalOrdersToday = 0;
    let totalRevenueToday = 0;
    for (const s of shops) {
      try {
        const count = await orderRepository.countTodayByShop(s.id);
        totalOrdersToday += count;
      } catch {
        // fallback
      }
    }

    return {
      totalShops,
      activeShops,
      inactiveShops,
      totalOrdersToday,
      totalRevenueToday,
    };
  }

  async getMyShops(ownerId: string): Promise<ShopResponse[]> {
    const shops = await shopRepository.findByOwnerId(ownerId);
    return shops.map((s) => this.formatShopResponse(s));
  }

  async getShopById(shopId: string): Promise<ShopResponse> {
    const shop = await shopRepository.findById(shopId);
    if (!shop) {
      throw AppError.notFound('Shop not found');
    }
    return this.formatShopResponse(shop);
  }

  async getPublicShop(publicShopId: string): Promise<any> {
    const shop = await shopRepository.findByPublicId(publicShopId);
    if (!shop) {
      throw AppError.notFound('Print shop not found');
    }

    if (shop.status !== 'ACTIVE') {
      throw AppError.forbidden('This print shop is currently inactive or suspended');
    }

    return this.formatPublicShopResponse(shop);
  }

  async createGuestSession(publicShopId: string): Promise<GuestSessionResponse> {
    const shop = await shopRepository.findByPublicId(publicShopId);
    if (!shop) {
      throw AppError.notFound('Print shop not found');
    }

    if (shop.status !== 'ACTIVE') {
      throw AppError.forbidden('This print shop is currently inactive or suspended');
    }

    const guestSessionId = crypto.randomUUID();
    const sessionToken = generateGuestToken({
      guestSessionId,
      shopId: shop.id,
    });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    logger.info(
      { guestSessionId, shopId: shop.id, publicShopId: shop.publicShopId },
      'Guest customer session issued',
    );

    return {
      sessionToken,
      guestSessionId,
      shopId: shop.id,
      publicShopId: shop.publicShopId,
      expiresAt,
    };
  }

  async updateShop(
    shopId: string,
    ownerId: string,
    data: UpdateShopBody,
    userRole: string,
  ): Promise<ShopResponse> {
    const shop = await shopRepository.findById(shopId);
    if (!shop) {
      throw AppError.notFound('Shop not found');
    }

    if (userRole !== 'ADMIN' && userRole !== 'PARTNER' && shop.ownerId !== ownerId) {
      throw AppError.forbidden('You do not have permission to update this shop');
    }

    const updated = await shopRepository.update(shop.id, data as any);
    if (!updated) {
      throw AppError.notFound('Shop not found for update');
    }

    logger.info({ shopId: updated.id }, 'Shop updated successfully');
    return this.formatShopResponse(updated);
  }

  async updatePricing(
    shopId: string,
    userId: string,
    userRole: string,
    pricing: { pricePerPageBW?: number; pricePerPageColor?: number; duplexDiscount?: number },
  ): Promise<ShopResponse> {
    const shop = await shopRepository.findById(shopId);
    if (!shop) {
      throw AppError.notFound('Shop not found');
    }

    if (userRole !== 'ADMIN' && userRole !== 'PARTNER' && shop.ownerId !== userId) {
      throw AppError.forbidden('You do not have permission to configure pricing for this shop');
    }

    const updated = await shopRepository.update(shop.id, {
      pricePerPageBW:
        pricing.pricePerPageBW !== undefined ? (pricing.pricePerPageBW as any) : undefined,
      pricePerPageColor:
        pricing.pricePerPageColor !== undefined ? (pricing.pricePerPageColor as any) : undefined,
      duplexDiscount:
        pricing.duplexDiscount !== undefined ? (pricing.duplexDiscount as any) : undefined,
    });

    if (!updated) {
      throw AppError.notFound('Shop not found for pricing update');
    }

    logger.info({ shopId: updated.id, pricing }, 'Shop pricing updated successfully');
    return this.formatShopResponse(updated);
  }

  async getShopDashboard(shopId: string, ownerId: string, userRole: string) {
    const shop = await shopRepository.findById(shopId);
    if (!shop) throw AppError.notFound('Shop not found');
    if (userRole !== 'ADMIN' && userRole !== 'PARTNER' && shop.ownerId !== ownerId) {
      throw AppError.forbidden('You do not have permission to view this shop dashboard');
    }

    const [todayOrders, activeOrders, completedToday, todayRevenue] = await Promise.all([
      orderRepository.countTodayByShop(shopId),
      orderRepository.getActiveCountByShop(shopId),
      orderRepository.getCompletedCountTodayByShop(shopId),
      orderRepository.getTodayRevenueByShop(shopId),
    ]);

    return {
      todayOrders,
      activeOrders,
      completedToday,
      todayRevenue,
    };
  }

  async getShopOrders(
    shopId: string,
    ownerId: string,
    userRole: string,
    filters: any,
    page: number = 1,
    limit: number = 50,
  ) {
    const shop = await shopRepository.findById(shopId);
    if (!shop) throw AppError.notFound('Shop not found');
    if (userRole !== 'ADMIN' && userRole !== 'PARTNER' && shop.ownerId !== ownerId) {
      throw AppError.forbidden('You do not have permission to view this shop orders');
    }

    return orderRepository.findShopOrders(shopId, filters, page, limit);
  }

  async getShopTransactions(
    shopId: string,
    ownerId: string,
    userRole: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const shop = await shopRepository.findById(shopId);
    if (!shop) throw AppError.notFound('Shop not found');
    if (userRole !== 'ADMIN' && userRole !== 'PARTNER' && shop.ownerId !== ownerId) {
      throw AppError.forbidden('You do not have permission to view this shop transactions');
    }

    return orderRepository.findShopTransactions(shopId, page, limit);
  }

  private generatePublicShopId(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let slug = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      slug += chars[bytes[i] % chars.length];
    }
    return `shop_${slug}`;
  }

  private formatPublicShopResponse(shop: ShopWithPrinters) {
    return {
      id: shop.id,
      publicShopId: shop.publicShopId,
      name: shop.name,
      qrCode: shop.qrCode,
      address: shop.address,
      city: shop.city,
      pincode: shop.pincode,
      phone: shop.phone,
      email: shop.email,
      operatingHours: shop.operatingHours,
      status: shop.status,
      pricePerPageBW: shop.pricePerPageBW !== undefined ? Number(shop.pricePerPageBW) : 2.0,
      pricePerPageColor:
        shop.pricePerPageColor !== undefined ? Number(shop.pricePerPageColor) : 10.0,
      duplexDiscount: shop.duplexDiscount !== undefined ? Number(shop.duplexDiscount) : 0.0,
      printers: (shop.printers || []).map((p) => ({
        id: p.id,
        name: p.name,
        printerType: p.printerType,
        status: p.status,
        pagesPerMinute: p.pagesPerMinute,
      })),
      estimatedWait: 0,
    };
  }

  private formatShopResponse(shop: ShopWithPrinters): ShopResponse {
    return {
      id: shop.id,
      publicShopId: shop.publicShopId,
      name: shop.name,
      createdByPartnerId: shop.createdByPartnerId,
      ownerId: shop.ownerId,
      qrCode: shop.qrCode,
      address: shop.address,
      city: shop.city,
      pincode: shop.pincode,
      phone: shop.phone,
      email: shop.email,
      operatingHours: shop.operatingHours,
      status: shop.status,
      pricePerPageBW: shop.pricePerPageBW !== undefined ? Number(shop.pricePerPageBW) : 2.0,
      pricePerPageColor:
        shop.pricePerPageColor !== undefined ? Number(shop.pricePerPageColor) : 10.0,
      duplexDiscount: shop.duplexDiscount !== undefined ? Number(shop.duplexDiscount) : 0.0,
      printers: (shop.printers || []).map((p) => ({
        id: p.id,
        name: p.name,
        printerType: p.printerType,
        status: p.status,
        pagesPerMinute: p.pagesPerMinute,
      })),
      estimatedWait: 0,
    };
  }
}

export const shopService = new ShopService();
