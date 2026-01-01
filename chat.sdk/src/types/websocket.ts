// Client -> Server messages
export interface UserMessage {
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
  | UserMessage
  | PingMessage
  | AbortMessage
  | NewConversationMessage
  | ResetMessage;

// Server -> Client messages
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

export interface StatusMessage {
  type: 'status';
  payload: {
    status: 'typing' | 'processing' | 'idle';
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

export interface CompleteMessage {
  type: 'complete';
  payload: {
    messageId: string;
    content: string;
    tokenUsage: {
      prompt: number;
      completion: number;
      total: number;
    };
    metadata?: Record<string, unknown>;
    followUpQuestions?: string[];
  };
}

export interface ErrorMessage {
  type: 'error';
  payload: {
    code: string;
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
