export type DisplayMode = 'embedded' | 'floating';
export type FloatingPosition = 'bottom-right' | 'bottom-left';
export type Theme = 'light' | 'dark' | 'auto';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface HeshevChatConfig {
  // Required
  websocketUrl: string;

  // Display mode
  mode: DisplayMode;
  container?: string | HTMLElement;  // Required for 'embedded' mode

  // Optional customization
  cssUrl?: string;
  cssOverrides?: string;
  theme?: Theme;
  rtl?: boolean;

  // Color customization
  colors?: {
    userBubble?: string;
    userBubbleText?: string;
    assistantBubble?: string;
    assistantBubbleText?: string;
    followUpButton?: string;
    followUpButtonText?: string;
    labelColor?: string;
  };

  // UI texts
  texts?: {
    title?: string;
    placeholder?: string;
    placeholderConnecting?: string;
    placeholderLoading?: string;
    emptyStateTitle?: string;
    emptyStateSubtitle?: string;
    statusConnected?: string;
    statusConnecting?: string;
    statusDisconnected?: string;
    statusError?: string;
    processing?: string;
    closeButton?: string;
    userLabel?: string;
    assistantLabel?: string;
    disclaimer?: string;
  };

  // Floating mode options
  floatingPosition?: FloatingPosition;
  floatingButtonText?: string;
  floatingButtonIcon?: string;

  // Context options (can be set at init OR loaded later via methods)
  systemInstructions?: string;  // Custom system prompt
  fileContent?: string;         // Initial file content
  metadata?: Record<string, unknown>;  // Additional JSON data

  // Behavior
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  showFollowUpQuestions?: boolean;  // Show follow-up question suggestions (default: true)

  // Callbacks
  onReady?: () => void;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  followUpQuestions?: string[];
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface ChatState {
  messages: ChatMessage[];
  tokenUsage: TokenUsage;
  isConnected: boolean;
  isReady: boolean;
  serverStatus: 'idle' | 'typing' | 'processing';
  currentFollowUpQuestions?: string[];
}

export interface SavedState {
  messages: ChatMessage[];
  tokenUsage: TokenUsage;
  timestamp: string;
}

export interface UITexts {
  title: string;
  placeholder: string;
  placeholderConnecting: string;
  placeholderLoading: string;
  emptyStateTitle: string;
  emptyStateSubtitle: string;
  statusConnected: string;
  statusConnecting: string;
  statusDisconnected: string;
  statusError: string;
  processing: string;
  closeButton: string;
  followUpPrompt: string;
  userLabel: string;
  assistantLabel: string;
  disclaimer?: string;
}
