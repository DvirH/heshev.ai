import type { WebSocket } from 'ws';
import { handleMessage } from './messageRouter.ts';
import { sessionManager } from './sessionManager.ts';
import { logger } from '../utils/logger.ts';

export function setupWebSocketHandlers(ws: WebSocket): void {
  logger.debug('New WebSocket connection');

  ws.on('message', (data: Buffer | string) => {
    try {
      const message = typeof data === 'string' ? data : data.toString('utf-8');
      handleMessage(ws, message);
    } catch (error) {
      logger.error('Error handling WebSocket message', error);
    }
  });

  ws.on('close', (code: number, reason: Buffer) => {
    const session = sessionManager.getByWebSocket(ws);
    const sessionId = session?.id;

    // Clean up session
    sessionManager.destroyByWebSocket(ws);

    logger.info('WebSocket connection closed', {
      sessionId,
      code,
      reason: reason.toString(),
    });
  });

  ws.on('error', (error: Error) => {
    const session = sessionManager.getByWebSocket(ws);
    logger.error('WebSocket error', error, { sessionId: session?.id });

    // Clean up session on error
    sessionManager.destroyByWebSocket(ws);
  });

  ws.on('pong', () => {
    // Update session activity on pong
    const session = sessionManager.getByWebSocket(ws);
    if (session) {
      session.lastActivity = new Date();
    }
  });
}
