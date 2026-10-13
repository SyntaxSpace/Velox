import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../config/jwt';
import { shopRepository } from '../repositories/shop.repository';
import { AppError } from '../utils/app-error';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In development mode, provide a default shop admin payload only if no explicit token is needed
      if (process.env.NODE_ENV === 'development' && !req.headers['x-test-auth']) {
        req.user = {
          userId: 'dev-admin-id',
          email: 'admin@velox.dev',
          role: 'ADMIN',
          shopId: 'demo-shop-id',
        };
        next();
        return;
      }
      throw AppError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(AppError.unauthorized('Invalid or expired token'));
  }
}

export function authenticateGuestOrUser(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const guestHeader = req.headers['x-guest-session'] as string | undefined;

    let token: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (guestHeader) {
      token = guestHeader;
    }

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
        return;
      } catch (tokenError) {
        // Fallback: If Authorization bearer was invalid/expired (e.g. stale login token),
        // but a separate x-guest-session was provided, verify the guest session.
        if (guestHeader && guestHeader !== token) {
          try {
            const guestPayload = verifyAccessToken(guestHeader);
            req.user = guestPayload;
            next();
            return;
          } catch {
            // Both failed, throw original error
          }
        }
        throw tokenError;
      }
    }

    if (process.env.NODE_ENV === 'development' && !req.headers['x-test-auth']) {
      req.user = {
        userId: 'dev-admin-id',
        email: 'admin@velox.dev',
        role: 'ADMIN',
        shopId: 'demo-shop-id',
      };
      next();
      return;
    }

    throw AppError.unauthorized('Authentication required: provide user or guest session token');
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(AppError.unauthorized('Invalid or expired token'));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Not authenticated'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden('Insufficient permissions'));
      return;
    }

    next();
  };
}

export function requireShopOwner(paramName = 'shopId') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Not authenticated');
      }

      // Admins and Partners have platform-wide access
      if (req.user.role === 'ADMIN' || req.user.role === 'PARTNER') {
        next();
        return;
      }

      const targetShopId = req.params[paramName] || req.body[paramName] || req.query[paramName];
      if (!targetShopId) {
        throw AppError.badRequest('Shop identifier is required');
      }

      const shop = await shopRepository.findById(targetShopId);
      if (!shop) {
        throw AppError.notFound('Shop not found');
      }

      if (req.user.role === 'SHOP_OWNER' || req.user.role === 'OWNER') {
        if (shop.ownerId !== req.user.userId) {
          throw AppError.forbidden('Access denied: You do not own this shop');
        }
        next();
        return;
      }

      if (req.user.role === 'OPERATOR') {
        if (req.user.shopId !== shop.id && req.user.shopId !== shop.publicShopId) {
          throw AppError.forbidden('Access denied: You are not assigned to this shop');
        }
        next();
        return;
      }

      if (req.user.role === 'AGENT') {
        if (req.user.shopId !== shop.id) {
          throw AppError.forbidden('Access denied: Agent is not bound to this shop');
        }
        next();
        return;
      }

      throw AppError.forbidden('Insufficient permissions: Shop Owner or Partner role required');
    } catch (err) {
      next(err);
    }
  };
}
