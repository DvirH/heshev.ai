// Client -> Server message types
export type ClientMessageType =
  | 'message'
  | 'ping'
  | 'abort'
  | 'new_conversation'
  | 'reset';

export interface ChatMessage {
  type: 'message';
  payload: {
    content: string;
    conversationId?: string;
    messageId: string;
  };
}

export interface PingMessage {
  type: 'ping';
}

export interface AbortMessage {
  type: 'abort';
  payload: {
    messageId: string;
  };
}

export interface NewConversationMessage {
  type: 'new_conversation';
}

export interface ResetMessage {
  type: 'reset';
}

export type ClientMessage =
  | ChatMessage
  | PingMessage
  | AbortMessage
  | NewConversationMessage
  | ResetMessage;

// Server -> Client message types
export type ServerMessageType =
  | 'connected'
  | 'ready'
  | 'status'
  | 'stream'
  | 'complete'
  | 'error'
  | 'pong';

export interface ConnectedMessage {
  type: 'connected';
  payload: {
    sessionId: string;
    serverVersion?: string;
  };
}

export interface ReadyMessage {
  type: 'ready';
  payload: {
    contextId?: string;
  };
}

export type ServerStatus = 'typing' | 'processing' | 'idle';

export interface StatusMessage {
  type: 'status';
  payload: {
    status: ServerStatus;
    message?: string;
  };
}

export interface StreamMessage {
  type: 'stream';
  payload: {
    chunk: string;
    messageId: string;
  };
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface CompleteMessage {
  type: 'complete';
  payload: {
    messageId: string;
    content: string;
    tokenUsage: TokenUsage;
    metadata?: Record<string, unknown>;
    followUpQuestions?: string[];
  };
}

export type ErrorCode =
  | 'CONNECTION_ERROR'
  | 'AUTH_FAILED'
  | 'RATE_LIMIT'
  | 'CONTEXT_TOO_LARGE'
  | 'MESSAGE_TOO_LONG'
  | 'STREAM_ABORTED'
  | 'SERVER_ERROR'
  | 'TIMEOUT';

export interface ErrorMessage {
  type: 'error';
  payload: {
    code: ErrorCode;
    message: string;
    messageId?: string;
    retryable: boolean;
  };
}

export interface PongMessage {
  type: 'pong';
}

export type ServerMessage =
  | ConnectedMessage
  | ReadyMessage
  | StatusMessage
  | StreamMessage
  | CompleteMessage
  | ErrorMessage
  | PongMessage;

// Conversation message for history
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageId?: string;
  timestamp: Date;
}
