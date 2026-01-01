import { v4 as uuidv4 } from 'uuid';
import type { WebSocket } from 'ws';
import type { Session, SessionCreateOptions } from '../types/index.ts';
import type { ConversationMessage } from '../types/messages.ts';
import { logger } from '../utils/logger.ts';
import { config } from '../utils/config.ts';

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup(config.sessionTimeoutMs);
    }, 60000); // Check every minute
  }

  create(options: SessionCreateOptions): Session {
    const sessionId = options.clientId ?? uuidv4();

    // If session exists with same clientId, clean it up first
    if (this.sessions.has(sessionId)) {
      this.destroy(sessionId);
    }

    const session: Session = {
      id: sessionId,
      ws: options.ws ?? null,
      context: null,
      conversationHistory: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      clientMetadata: options.metadata,
      totalTokenUsage: {
        prompt: 0,
        completion: 0,
        total: 0,
      },
    };

    this.sessions.set(sessionId, session);
    logger.info('Session created', { sessionId });
    return session;
  }

  createForApi(options: { clientId?: string; metadata?: Record<string, unknown> } = {}): Session {
    return this.create({
      clientId: options.clientId,
      metadata: options.metadata,
    });
  }

  exists(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  attachWebSocket(sessionId: string, ws: WebSocket): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // If session already has a WebSocket, close the old one
    if (session.ws && session.ws.readyState === ws.OPEN) {
      session.ws.close(1000, 'Replaced by new connection');
    }

    session.ws = ws;
    session.lastActivity = new Date();
    logger.info('WebSocket attached to session', { sessionId });
    return true;
  }

  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getByWebSocket(ws: WebSocket): Session | undefined {
    for (const session of this.sessions.values()) {
      if (session.ws === ws) {
        return session;
      }
    }
    return undefined;
  }

  destroy(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Abort any active stream
      if (session.activeStreamController) {
        session.activeStreamController.abort();
      }
      this.sessions.delete(sessionId);
      logger.info('Session destroyed', { sessionId });
    }
  }

  destroyByWebSocket(ws: WebSocket): void {
    const session = this.getByWebSocket(ws);
    if (session) {
      this.destroy(session.id);
    }
  }

  updateContext(sessionId: string, context: Record<string, unknown>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.context = context;
      session.lastActivity = new Date();
      logger.debug('Context updated', { sessionId });
    }
  }

  updateSystemInstructions(sessionId: string, instructions: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.systemInstructions = instructions;
      session.lastActivity = new Date();
      logger.debug('System instructions updated', { sessionId });
    }
  }

  addMessage(sessionId: string, message: ConversationMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.conversationHistory.push(message);
      session.lastActivity = new Date();
    }
  }

  updateTokenUsage(sessionId: string, prompt: number, completion: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.totalTokenUsage.prompt += prompt;
      session.totalTokenUsage.completion += completion;
      session.totalTokenUsage.total += prompt + completion;
    }
  }

  clearConversation(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.conversationHistory = [];
      session.lastActivity = new Date();
      logger.debug('Conversation cleared', { sessionId });
    }
  }

  reset(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.context = null;
      session.conversationHistory = [];
      session.totalTokenUsage = { prompt: 0, completion: 0, total: 0 };
      session.systemInstructions = undefined;
      session.lastActivity = new Date();
      logger.debug('Session reset', { sessionId });
    }
  }

  setActiveStream(sessionId: string, controller: AbortController | undefined): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.activeStreamController = controller;
    }
  }

  cleanup(maxAge: number): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity.getTime();
      if (age > maxAge) {
        this.destroy(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up stale sessions', { count: cleaned });
    }
  }

  getStats(): { totalSessions: number; activeSessions: number } {
    let activeSessions = 0;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    for (const session of this.sessions.values()) {
      if (session.lastActivity.getTime() > fiveMinutesAgo) {
        activeSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
    };
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Destroy all sessions
    for (const sessionId of this.sessions.keys()) {
      this.destroy(sessionId);
    }

    logger.info('SessionManager shutdown complete');
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
