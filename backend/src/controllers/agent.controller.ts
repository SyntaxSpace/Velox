import { Request, Response, NextFunction } from 'express';
import { agentService } from '../services/agent.service';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../utils/app-error';

export class AgentController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await agentService.authenticateDevice(req.body);
      sendSuccess(res, result, 'Agent authenticated successfully');
    } catch (error) {
      next(error);
    }
  }

  async heartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.shopId || !req.user.deviceId) {
        throw AppError.unauthorized('Agent authentication required');
      }
      const result = await agentService.recordHeartbeat(req.user.shopId, req.user.deviceId);
      sendSuccess(res, result, 'Heartbeat recorded');
    } catch (error) {
      next(error);
    }
  }

  async syncPrinters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.shopId || !req.user.deviceId) {
        throw AppError.unauthorized('Agent authentication required');
      }
      const { printers } = req.body;
      const result = await agentService.syncPrinters(
        req.user.shopId,
        req.user.deviceId,
        printers || [],
      );
      sendSuccess(res, result, 'Printers synchronized');
    } catch (error) {
      next(error);
    }
  }

  async downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const shopId = req.user?.shopId;

      if (!shopId) {
        throw AppError.unauthorized('Authentication with shop association required');
      }

      const fileInfo = await agentService.getAuthorizedOrderFile(orderId, shopId);

      // Set security & checksum headers
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Length', fileInfo.size);
      res.setHeader('X-Checksum-SHA256', fileInfo.checksum);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);

      res.end(fileInfo.buffer);
    } catch (error) {
      next(error);
    }
  }
}

export const agentController = new AgentController();
