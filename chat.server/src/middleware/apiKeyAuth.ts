import { Request, Response, NextFunction } from 'express';
import { config } from '../utils/config.ts';
import { logger } from '../utils/logger.ts';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.header('x-api-key');
  const apiSecret = req.header('x-api-secret');

  if (!config.apiKey || !config.apiSecret) {
    logger.error('API_KEY or API_SECRET not configured on server');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  if (!apiKey || !apiSecret) {
    res.status(401).json({ error: 'API key and secret required' });
    return;
  }

  if (apiKey !== config.apiKey) {
    logger.warn('Invalid API key attempt');
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  if (apiSecret !== config.apiSecret) {
    logger.warn('Invalid API secret attempt');
    res.status(403).json({ error: 'Invalid API secret' });
    return;
  }

  next();
}
