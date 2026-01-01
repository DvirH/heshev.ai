import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { sessionManager } from '../websocket/sessionManager.ts';
import { config } from '../utils/config.ts';
import { logger } from '../utils/logger.ts';

const router: RouterType = Router();

// POST /api/sessions - Create new session
router.post('/sessions', (req: Request, res: Response) => {
  const { metadata } = req.body ?? {};

  const session = sessionManager.createForApi({ metadata });

  // Build WebSocket URL
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
  const host = req.get('host');
  const websocketUrl = `${protocol}://${host}${config.wsPath}/${session.id}`;

  res.status(201).json({
    sessionId: session.id,
    websocketUrl,
    expiresAt: new Date(Date.now() + config.sessionTimeoutMs).toISOString(),
  });

  logger.info('Session created via API', { sessionId: session.id });
});

// POST /api/sessions/:sessionId/context
router.post('/sessions/:sessionId/context', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { data } = req.body;

  if (!sessionManager.exists(sessionId)) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Context data object required' });
    return;
  }

  sessionManager.updateContext(sessionId, data);
  res.json({ success: true });

  logger.info('Context loaded via API', { sessionId });
});

// POST /api/sessions/:sessionId/instructions
router.post('/sessions/:sessionId/instructions', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { content } = req.body;

  if (!sessionManager.exists(sessionId)) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'Instructions content string required' });
    return;
  }

  sessionManager.updateSystemInstructions(sessionId, content);
  res.json({ success: true });

  logger.info('Instructions set via API', { sessionId });
});

export { router as sessionRoutes };
