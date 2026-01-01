import type { WebSocket } from 'ws';
import type {
  ClientMessage,
  ServerMessage,
  StatusMessage,
  PongMessage,
  ErrorMessage,
} from '../types/index.ts';
import { sessionManager } from './sessionManager.ts';
import { streamChatResponse, abortStream } from '../llm/streaming.ts';
import { logger } from '../utils/logger.ts';

function sendMessage(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, code: ErrorMessage['payload']['code'], message: string, messageId?: string): void {
  const errorMsg: ErrorMessage = {
    type: 'error',
    payload: {
      code,
      message,
      messageId,
      retryable: code !== 'AUTH_FAILED',
    },
  };
  sendMessage(ws, errorMsg);
}

export function handleMessage(ws: WebSocket, sessionId: string, data: string): void {
  let message: ClientMessage;

  try {
    message = JSON.parse(data) as ClientMessage;
  } catch {
    sendError(ws, 'SERVER_ERROR', 'Invalid JSON message');
    return;
  }

  const session = sessionManager.get(sessionId);

  if (!session) {
    sendError(ws, 'CONNECTION_ERROR', 'Session not found');
    return;
  }

  switch (message.type) {
    case 'message': {
      const { content, messageId } = message.payload;

      if (!content || !messageId) {
        sendError(ws, 'SERVER_ERROR', 'Message content and messageId are required');
        return;
      }

      // Check message length (10k chars max)
      if (content.length > 10000) {
        sendError(ws, 'MESSAGE_TOO_LONG', 'Message exceeds maximum length of 10000 characters', messageId);
        return;
      }

      // Check if there's an active stream
      if (session.activeStreamController) {
        sendError(ws, 'SERVER_ERROR', 'Another message is being processed. Wait or abort first.', messageId);
        return;
      }

      // Stream the response
      streamChatResponse({
        session,
        userMessage: content,
        messageId,
      });
      break;
    }

    case 'ping': {
      const pong: PongMessage = { type: 'pong' };
      sendMessage(ws, pong);
      session.lastActivity = new Date();
      break;
    }

    case 'abort': {
      abortStream(session);
      logger.debug('Abort requested', { sessionId, messageId: message.payload.messageId });
      break;
    }

    case 'new_conversation': {
      // Clear conversation but keep context
      sessionManager.clearConversation(sessionId);

      const idleStatus: StatusMessage = {
        type: 'status',
        payload: { status: 'idle' },
      };
      sendMessage(ws, idleStatus);

      logger.info('New conversation started', { sessionId });
      break;
    }

    case 'reset': {
      // Full reset - clear context and conversation
      sessionManager.reset(sessionId);

      const idleStatus: StatusMessage = {
        type: 'status',
        payload: { status: 'idle' },
      };
      sendMessage(ws, idleStatus);

      logger.info('Session reset', { sessionId });
      break;
    }

    default:
      sendError(ws, 'SERVER_ERROR', `Unknown message type: ${(message as { type: string }).type}`);
  }
}
