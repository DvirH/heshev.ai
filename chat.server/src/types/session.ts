import type { WebSocket } from 'ws';
import type { ConversationMessage, TokenUsage } from './messages.ts';

export interface Session {
  id: string;
  ws: WebSocket | null;
  context: Record<string, unknown> | null;
  conversationHistory: ConversationMessage[];
  createdAt: Date;
  lastActivity: Date;
  clientMetadata?: Record<string, unknown>;
  totalTokenUsage: TokenUsage;
  activeStreamController?: AbortController;
  systemInstructions?: string;
}

export interface SessionCreateOptions {
  ws?: WebSocket;
  clientId?: string;
  metadata?: Record<string, unknown>;
}
