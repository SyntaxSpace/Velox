import { Shop, Printer, ShopStatus } from '@prisma/client';
import { prisma, isDbOffline } from '../database/prisma';
import crypto from 'crypto';

export interface ShopWithPrinters extends Shop {
  printers: Printer[];
}

const demoShop: ShopWithPrinters = {
  id: 'demo-shop-id',
  publicShopId: 'demo-shop-id',
  name: 'Campus Print Hub',
  ownerId: 'dev-admin-id',
  address: 'Near Central Library, North Campus',
  city: 'Delhi',
  pincode: '110007',
  phone: '+919876543210',
  email: 'hub@velox.dev',
  operatingHours: '8:00 AM - 10:00 PM',
  qrCode: 'QR_DEMO_CAMPUS_HUB',
  status: ShopStatus.ACTIVE,
  pricePerPageBW: 2.0 as any,
  pricePerPageColor: 10.0 as any,
  duplexDiscount: 0.0 as any,
  createdByPartnerId: 'dev-partner-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  printers: [
    {
      id: 'printer-dev-1',
      name: 'Microsoft Print to PDF',
      printerType: 'COLOR',
      status: 'ONLINE',
      pagesPerMinute: 20,
      shopId: 'demo-shop-id',
      ipAddress: 'WinSpool / Local',
      createdAt: new Date(),
    },
    {
      id: 'printer-dev-2',
      name: 'OneNote (Desktop)',
      printerType: 'COLOR',
      status: 'ONLINE',
      pagesPerMinute: 15,
      shopId: 'demo-shop-id',
      ipAddress: 'WinSpool / Local',
      createdAt: new Date(),
    },
  ],
};

export const devShops = new Map<string, ShopWithPrinters>();
devShops.set(demoShop.id, demoShop);

export class ShopRepository {
  async create(data: {
    name: string;
    publicShopId: string;
    ownerId: string;
    qrCode: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    operatingHours?: string;
    email?: string;
    createdByPartnerId?: string;
    pricePerPageBW?: number;
    pricePerPageColor?: number;
    duplexDiscount?: number;
  }): Promise<ShopWithPrinters> {
    const bw = (data.pricePerPageBW ?? 2.0) as any;
    const color = (data.pricePerPageColor ?? 10.0) as any;
    const duplex = (data.duplexDiscount ?? 0.0) as any;

    if (isDbOffline) {
      const newShop: ShopWithPrinters = {
        id: crypto.randomUUID(),
        publicShopId: data.publicShopId,
        name: data.name,
        createdByPartnerId: data.createdByPartnerId ?? null,
        ownerId: data.ownerId,
        qrCode: data.qrCode,
        address: data.address,
        city: data.city,
        pincode: data.pincode,
        phone: data.phone,
        email: data.email ?? null,
        operatingHours: data.operatingHours ?? '9:00 AM - 9:00 PM',
        status: ShopStatus.ACTIVE,
        pricePerPageBW: bw,
        pricePerPageColor: color,
        duplexDiscount: duplex,
        createdAt: new Date(),
        updatedAt: new Date(),
        printers: [],
      };
      devShops.set(newShop.id, newShop);
      return newShop;
    }

    try {
      const created = await prisma.shop.create({
        data: {
          name: data.name,
          publicShopId: data.publicShopId,
          createdByPartnerId: data.createdByPartnerId,
          ownerId: data.ownerId,
          qrCode: data.qrCode,
          phone: data.phone,
          address: data.address,
          city: data.city,
          pincode: data.pincode,
          operatingHours: data.operatingHours ?? '9:00 AM - 9:00 PM',
          email: data.email,
          status: ShopStatus.ACTIVE,
          pricePerPageBW: bw,
          pricePerPageColor: color,
          duplexDiscount: duplex,
        },
        include: {
          printers: true,
        },
      });
      return created;
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const newShop: ShopWithPrinters = {
          id: crypto.randomUUID(),
          publicShopId: data.publicShopId,
          name: data.name,
          createdByPartnerId: data.createdByPartnerId ?? null,
          ownerId: data.ownerId,
          qrCode: data.qrCode,
          address: data.address,
          city: data.city,
          pincode: data.pincode,
          phone: data.phone,
          email: data.email ?? null,
          operatingHours: data.operatingHours ?? '9:00 AM - 9:00 PM',
          status: ShopStatus.ACTIVE,
          pricePerPageBW: bw,
          pricePerPageColor: color,
          duplexDiscount: duplex,
          createdAt: new Date(),
          updatedAt: new Date(),
          printers: [],
        };
        devShops.set(newShop.id, newShop);
        return newShop;
      }
      throw err;
    }
  }

  async findAll(): Promise<ShopWithPrinters[]> {
    if (isDbOffline) {
      return Array.from(devShops.values());
    }
    try {
      const shops = await prisma.shop.findMany({
        include: {
          printers: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return shops;
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return Array.from(devShops.values());
      }
      throw err;
    }
  }

  async findById(id: string): Promise<ShopWithPrinters | null> {
    if (isDbOffline) {
      return (
        devShops.get(id) || Array.from(devShops.values()).find((s) => s.publicShopId === id) || null
      );
    }
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const whereClause: any = isUuid
        ? { OR: [{ id }, { publicShopId: id }] }
        : { publicShopId: id };

      const shop = await prisma.shop.findFirst({
        where: whereClause,
        include: {
          printers: {
            select: {
              id: true,
              name: true,
              printerType: true,
              status: true,
              pagesPerMinute: true,
              shopId: true,
              ipAddress: true,
              createdAt: true,
            },
          },
        },
      });
      return shop;
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return (
          devShops.get(id) ||
          Array.from(devShops.values()).find((s) => s.publicShopId === id) ||
          null
        );
      }
      throw err;
    }
  }

  async findByPublicId(publicShopId: string): Promise<ShopWithPrinters | null> {
    if (isDbOffline) {
      for (const s of devShops.values()) {
        if (s.publicShopId === publicShopId || s.id === publicShopId) return s;
      }
      return null;
    }
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        publicShopId,
      );
      const whereClause: any = isUuid
        ? { OR: [{ publicShopId }, { id: publicShopId }] }
        : { publicShopId };

      const shop = await prisma.shop.findFirst({
        where: whereClause,
        include: {
          printers: {
            select: {
              id: true,
              name: true,
              printerType: true,
              status: true,
              pagesPerMinute: true,
              shopId: true,
              ipAddress: true,
              createdAt: true,
            },
          },
        },
      });
      return shop;
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        for (const s of devShops.values()) {
          if (s.publicShopId === publicShopId || s.id === publicShopId) return s;
        }
        return null;
      }
      throw err;
    }
  }

  async findByOwnerId(ownerId: string): Promise<ShopWithPrinters[]> {
    if (isDbOffline) {
      return Array.from(devShops.values()).filter((s) => s.ownerId === ownerId);
    }
    try {
      const shops = await prisma.shop.findMany({
        where: { ownerId },
        include: {
          printers: {
            select: {
              id: true,
              name: true,
              printerType: true,
              status: true,
              pagesPerMinute: true,
              shopId: true,
              ipAddress: true,
              createdAt: true,
            },
          },
        },
      });
      return shops;
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        return Array.from(devShops.values()).filter((s) => s.ownerId === ownerId);
      }
      throw err;
    }
  }

  async update(shopId: string, data: Partial<Shop>): Promise<ShopWithPrinters | null> {
    if (isDbOffline) {
      const existing = await this.findById(shopId);
      if (!existing) return null;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      devShops.set(existing.id, updated);
      return updated;
    }
    try {
      const existing = await this.findById(shopId);
      if (!existing) return null;
      const updated = await prisma.shop.update({
        where: { id: existing.id },
        data: data as any,
        include: {
          printers: true,
        },
      });
      return updated;
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        const existing = await this.findById(shopId);
        if (!existing) return null;
        const updated = { ...existing, ...data, updatedAt: new Date() };
        devShops.set(existing.id, updated);
        return updated;
      }
      throw err;
    }
  }

  async findByQrCode(qrCode: string): Promise<ShopWithPrinters | null> {
    if (isDbOffline) {
      for (const s of devShops.values()) {
        if (s.qrCode === qrCode) return s;
      }
      return null;
    }
    try {
      const shop = await prisma.shop.findUnique({
        where: { qrCode },
        include: {
          printers: {
            select: {
              id: true,
              name: true,
              printerType: true,
              status: true,
              pagesPerMinute: true,
              shopId: true,
              ipAddress: true,
              createdAt: true,
            },
          },
        },
      });
      return shop;
    } catch (err) {
      if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
        for (const s of devShops.values()) {
          if (s.qrCode === qrCode) return s;
        }
        return null;
      }
      throw err;
    }
  }
}

export const shopRepository = new ShopRepository();
