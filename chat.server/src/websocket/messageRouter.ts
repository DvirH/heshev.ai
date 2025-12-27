import type { WebSocket } from 'ws';
import type {
  ClientMessage,
  ServerMessage,
  ConnectedMessage,
  ReadyMessage,
  StatusMessage,
  PongMessage,
  ErrorMessage,
} from '../types/index.ts';
import { sessionManager } from './sessionManager.ts';
import { streamChatResponse, abortStream } from '../llm/streaming.ts';
import { logger } from '../utils/logger.ts';

const SERVER_VERSION = '1.0.0';

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

export function handleMessage(ws: WebSocket, data: string): void {
  let message: ClientMessage;

  try {
    message = JSON.parse(data) as ClientMessage;
  } catch {
    sendError(ws, 'SERVER_ERROR', 'Invalid JSON message');
    return;
  }

  const session = sessionManager.getByWebSocket(ws);

  switch (message.type) {
    case 'init': {
      // Handle init - create or resume session
      const newSession = sessionManager.create({
        ws,
        clientId: message.payload.clientId,
        metadata: message.payload.metadata,
      });

      const response: ConnectedMessage = {
        type: 'connected',
        payload: {
          sessionId: newSession.id,
          serverVersion: SERVER_VERSION,
        },
      };
      sendMessage(ws, response);
      logger.info('Client initialized', { sessionId: newSession.id });
      break;
    }

    case 'context': {
      if (!session) {
        sendError(ws, 'CONNECTION_ERROR', 'Session not initialized. Send init message first.');
        return;
      }

      // Send processing status
      const processingStatus: StatusMessage = {
        type: 'status',
        payload: {
          status: 'processing',
          message: 'Loading context...',
        },
      };
      sendMessage(ws, processingStatus);

      // Store context
      sessionManager.updateContext(session.id, message.payload.data);

      // Send ready
      const ready: ReadyMessage = {
        type: 'ready',
        payload: {
          contextId: message.payload.contextId,
        },
      };
      sendMessage(ws, ready);

      // Send idle status
      const idleStatus: StatusMessage = {
        type: 'status',
        payload: { status: 'idle' },
      };
      sendMessage(ws, idleStatus);

      logger.info('Context loaded', { sessionId: session.id, contextId: message.payload.contextId });
      break;
    }

    case 'message': {
      if (!session) {
        sendError(ws, 'CONNECTION_ERROR', 'Session not initialized. Send init message first.');
        return;
      }

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

      // Update session activity if exists
      if (session) {
        session.lastActivity = new Date();
      }
      break;
    }

    case 'abort': {
      if (!session) {
        sendError(ws, 'CONNECTION_ERROR', 'Session not initialized');
        return;
      }

      abortStream(session);
      logger.debug('Abort requested', { sessionId: session.id, messageId: message.payload.messageId });
      break;
    }

    case 'new_conversation': {
      if (!session) {
        sendError(ws, 'CONNECTION_ERROR', 'Session not initialized');
        return;
      }

      // Clear conversation but keep context
      sessionManager.clearConversation(session.id);

      const idleStatus: StatusMessage = {
        type: 'status',
        payload: { status: 'idle' },
      };
      sendMessage(ws, idleStatus);

      logger.info('New conversation started', { sessionId: session.id });
      break;
    }

    case 'reset': {
      if (!session) {
        sendError(ws, 'CONNECTION_ERROR', 'Session not initialized');
        return;
      }

      // Full reset - clear context and conversation
      sessionManager.reset(session.id);

      const idleStatus: StatusMessage = {
        type: 'status',
        payload: { status: 'idle' },
      };
      sendMessage(ws, idleStatus);

      logger.info('Session reset', { sessionId: session.id });
      break;
    }

    case 'file': {
      if (!session) {
        sendError(ws, 'CONNECTION_ERROR', 'Session not initialized. Send init message first.');
        return;
      }

      const { content, filename } = message.payload;
      sessionManager.updateFileContent(session.id, content, filename);

      const ready: ReadyMessage = {
        type: 'ready',
        payload: {},
      };
      sendMessage(ws, ready);

      logger.info('File content loaded', { sessionId: session.id, filename });
      break;
    }

    case 'metadata': {
      if (!session) {
        sendError(ws, 'CONNECTION_ERROR', 'Session not initialized. Send init message first.');
        return;
      }

      let data = message.payload.data;

      // If data is a string, try to parse it as JSON
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          sendError(ws, 'SERVER_ERROR', 'Invalid JSON in metadata');
          return;
        }
      }

      sessionManager.updateMetadata(session.id, data as Record<string, unknown>, message.payload.merge ?? false);

      const ready: ReadyMessage = {
        type: 'ready',
        payload: {},
      };
      sendMessage(ws, ready);

      logger.info('Metadata loaded', { sessionId: session.id, merge: message.payload.merge });
      break;
    }

    case 'instructions': {
      if (!session) {
        sendError(ws, 'CONNECTION_ERROR', 'Session not initialized. Send init message first.');
        return;
      }

      sessionManager.updateSystemInstructions(session.id, message.payload.content);

      const ready: ReadyMessage = {
        type: 'ready',
        payload: {},
      };
      sendMessage(ws, ready);

      logger.info('System instructions updated', { sessionId: session.id });
      break;
    }

    default:
      sendError(ws, 'SERVER_ERROR', `Unknown message type: ${(message as { type: string }).type}`);
  }
}
