import type { WebSocket } from 'ws';
import { handleMessage } from './messageRouter.ts';
import { sessionManager } from './sessionManager.ts';
import { logger } from '../utils/logger.ts';
import type { ConnectedMessage } from '../types/messages.ts';

export function setupWebSocketHandlers(ws: WebSocket, sessionId: string): void {
  logger.debug('WebSocket connection established', { sessionId });

  // Send connected message immediately (session already exists from API)
  const connectedMsg: ConnectedMessage = {
    type: 'connected',
    payload: {
      sessionId,
      serverVersion: '1.0.0',
    },
  };
  ws.send(JSON.stringify(connectedMsg));

  ws.on('message', (data: Buffer | string) => {
    try {
      const message = typeof data === 'string' ? data : data.toString('utf-8');
      handleMessage(ws, sessionId, message);
    } catch (error) {
      logger.error('Error handling WebSocket message', error);
    }
  });

  ws.on('close', (code: number, reason: Buffer) => {
    // Clean up session
    sessionManager.destroy(sessionId);

    logger.info('WebSocket connection closed', {
      sessionId,
      code,
      reason: reason.toString(),
    });
  });

  ws.on('error', (error: Error) => {
    logger.error('WebSocket error', error, { sessionId });

    // Clean up session on error
    sessionManager.destroy(sessionId);
  });

  ws.on('pong', () => {
    // Update session activity on pong
    const session = sessionManager.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  });
}
