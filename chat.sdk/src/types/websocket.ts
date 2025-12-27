// Client -> Server messages
export interface InitMessage {
  type: 'init';
  payload: {
    clientId?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ContextMessage {
  type: 'context';
  payload: {
    data: Record<string, unknown>;
    contextId?: string;
  };
}

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

// File content message
export interface FileMessage {
  type: 'file';
  payload: {
    content: string;
    filename?: string;
  };
}

// Metadata message
export interface MetadataMessage {
  type: 'metadata';
  payload: {
    data: Record<string, unknown> | string;
    merge?: boolean;  // true = merge with existing, false = replace
  };
}

// System instructions message
export interface InstructionsMessage {
  type: 'instructions';
  payload: {
    content: string;
  };
}

export type ClientMessage =
  | InitMessage
  | ContextMessage
  | UserMessage
  | PingMessage
  | AbortMessage
  | NewConversationMessage
  | ResetMessage
  | FileMessage
  | MetadataMessage
  | InstructionsMessage;

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
