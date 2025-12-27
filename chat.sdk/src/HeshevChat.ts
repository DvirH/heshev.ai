import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import type {
  HeshevChatConfig,
  ChatMessage,
  TokenUsage,
  SavedState,
  ConnectionStatus,
  UITexts,
} from './types/config';
import type { CompleteMessage } from './types/websocket';
import { WebSocketClient } from './core/WebSocketClient';
import { StateManager } from './core/StateManager';
import { EventEmitter } from './core/EventEmitter';
import { ChatContainer } from './components/ChatContainer';
import { FloatingButton } from './components/FloatingButton';
import { Overlay } from './components/Overlay';
import { getContainer, createContainer, loadExternalCSS, injectStyles, removeElement } from './utils/dom';
import { generateId } from './utils/id';

// Import styles
import './styles/variables.css';
import './styles/base.css';
import './styles/chat.css';
import './styles/animations.css';

const DEFAULT_TEXTS_HE: UITexts = {
  title: 'צ\'אט',
  placeholder: 'הקלד הודעה...',
  placeholderConnecting: 'מתחבר...',
  placeholderLoading: 'טוען...',
  emptyStateTitle: 'אין הודעות עדיין',
  emptyStateSubtitle: 'התחל שיחה!',
  statusConnected: 'מחובר',
  statusConnecting: 'מתחבר...',
  statusDisconnected: 'מנותק',
  statusError: 'שגיאה',
  processing: 'מעבד...',
  closeButton: 'סגור צ\'אט',
  followUpPrompt: 'אולי תרצה לדעת:',
  userLabel: 'משתמש',
  assistantLabel: 'חשב AI',
};

const DEFAULT_TEXTS_EN: UITexts = {
  title: 'Chat',
  placeholder: 'Type a message...',
  placeholderConnecting: 'Connecting...',
  placeholderLoading: 'Loading...',
  emptyStateTitle: 'No messages yet',
  emptyStateSubtitle: 'Start a conversation!',
  statusConnected: 'Connected',
  statusConnecting: 'Connecting...',
  statusDisconnected: 'Disconnected',
  statusError: 'Error',
  processing: 'Processing...',
  closeButton: 'Close chat',
  followUpPrompt: 'Would you like to know:',
  userLabel: 'You',
  assistantLabel: 'AI Accountant',
};

export class HeshevChat extends EventEmitter {
  private config: Required<Omit<HeshevChatConfig, 'container' | 'texts' | 'metadata' | 'systemInstructions' | 'fileContent' | 'colors'>> & { container?: string | HTMLElement };
  private colors?: HeshevChatConfig['colors'];
  private texts: UITexts;
  private wsClient: WebSocketClient;
  private stateManager: StateManager;
  private root: Root | null = null;
  private containerElement: HTMLElement | null = null;
  private floatingRoot: Root | null = null;
  private floatingElement: HTMLElement | null = null;
  private isOpen = false;
  private isInitialized = false;

  constructor(config: HeshevChatConfig) {
    super();

    // Validate config
    if (!config.websocketUrl) {
      throw new Error('websocketUrl is required');
    }

    if (config.mode === 'embedded' && !config.container) {
      throw new Error('container is required for embedded mode');
    }

    // Set defaults
    this.config = {
      websocketUrl: config.websocketUrl,
      mode: config.mode,
      container: config.container,
      cssUrl: config.cssUrl ?? '',
      cssOverrides: config.cssOverrides ?? '',
      theme: config.theme ?? 'light',
      rtl: config.rtl ?? true,
      floatingPosition: config.floatingPosition ?? 'bottom-right',
      floatingButtonText: config.floatingButtonText ?? '',
      floatingButtonIcon: config.floatingButtonIcon ?? '',
      autoConnect: config.autoConnect ?? true,
      reconnectAttempts: config.reconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 3000,
      onReady: config.onReady ?? (() => {}),
      onMessage: config.onMessage ?? (() => {}),
      onError: config.onError ?? (() => {}),
      onStatusChange: config.onStatusChange ?? (() => {}),
      onOpen: config.onOpen ?? (() => {}),
      onClose: config.onClose ?? (() => {}),
    };

    // Initialize texts based on RTL setting, with user overrides
    const defaultTexts = this.config.rtl ? DEFAULT_TEXTS_HE : DEFAULT_TEXTS_EN;
    this.texts = {
      ...defaultTexts,
      ...config.texts,
    };

    // Store custom colors
    this.colors = config.colors;

    // Initialize core modules
    this.wsClient = new WebSocketClient({
      url: config.websocketUrl,
      reconnectAttempts: this.config.reconnectAttempts,
      reconnectDelay: this.config.reconnectDelay,
    });

    this.stateManager = new StateManager();

    // Setup WebSocket event handlers
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wsClient.on('statusChange', (status: ConnectionStatus) => {
      this.stateManager.setConnected(status === 'connected');
      this.config.onStatusChange(status);
      this.emit('statusChange', status);
      this.render();
    });

    this.wsClient.on('connected', () => {
      this.stateManager.setConnected(true);
    });

    this.wsClient.on('ready', () => {
      this.stateManager.setReady(true);
      this.config.onReady();
      this.emit('ready');
      this.render();
    });

    this.wsClient.on('serverStatus', (status: 'typing' | 'processing' | 'idle') => {
      this.stateManager.setServerStatus(status);
      this.render();
    });

    this.wsClient.on('stream', (chunk: string, _messageId: string) => {
      // If we don't have a streaming message yet, start one with a NEW unique ID
      // Using a separate ID prevents collision with user message IDs
      const streamingId = this.stateManager.getStreamingMessageId();
      if (!streamingId) {
        const assistantMessageId = generateId();
        this.stateManager.startAssistantMessage(assistantMessageId);
      }
      this.stateManager.appendToStreamingMessage(chunk);
      this.render();
    });

    this.wsClient.on('complete', (payload: CompleteMessage['payload']) => {
      this.stateManager.completeStreamingMessage(
        payload.content,
        payload.tokenUsage,
        payload.followUpQuestions
      );
      this.config.onMessage({
        id: payload.messageId,
        role: 'assistant',
        content: payload.content,
        timestamp: new Date(),
      });
      this.emit('message', payload);
      this.render();
    });

    this.wsClient.on('serverError', (error: { code: string; message: string }) => {
      const err = new Error(error.message);
      this.config.onError(err);
      this.emit('error', err);
    });

    this.wsClient.on('error', (error: Error) => {
      this.config.onError(error);
      this.emit('error', error);
    });
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Load custom CSS if provided
    if (this.config.cssUrl) {
      await loadExternalCSS(this.config.cssUrl);
    }

    // Inject custom CSS overrides
    if (this.config.cssOverrides) {
      injectStyles(this.config.cssOverrides, 'heshev-chat-overrides');
    }

    // Apply custom colors
    this.applyCustomColors();

    // Setup UI based on mode
    if (this.config.mode === 'embedded') {
      this.setupEmbeddedMode();
    } else {
      this.setupFloatingMode();
    }

    this.isInitialized = true;

    // Auto-connect if enabled
    if (this.config.autoConnect) {
      await this.connect();
    }
  }

  private setupEmbeddedMode(): void {
    const container = getContainer(this.config.container!);
    if (!container) {
      throw new Error(`Container not found: ${this.config.container}`);
    }

    this.containerElement = container;
    this.root = createRoot(container);
    this.render();
  }

  private setupFloatingMode(): void {
    // Create floating button container
    this.floatingElement = createContainer('heshev-chat-floating');
    document.body.appendChild(this.floatingElement);
    this.floatingRoot = createRoot(this.floatingElement);

    // Create chat container (hidden initially)
    this.containerElement = createContainer('heshev-chat-container');
    document.body.appendChild(this.containerElement);
    this.root = createRoot(this.containerElement);

    this.render();
  }

  private applyCustomColors(): void {
    if (!this.colors) return;

    const root = document.documentElement;
    const { colors } = this;

    if (colors.userBubble) {
      root.style.setProperty('--heshev-bubble-user', colors.userBubble);
    }
    if (colors.userBubbleText) {
      root.style.setProperty('--heshev-bubble-user-text', colors.userBubbleText);
    }
    if (colors.assistantBubble) {
      root.style.setProperty('--heshev-bubble-assistant', colors.assistantBubble);
    }
    if (colors.assistantBubbleText) {
      root.style.setProperty('--heshev-bubble-assistant-text', colors.assistantBubbleText);
    }
    if (colors.followUpButton) {
      root.style.setProperty('--heshev-follow-up-btn', colors.followUpButton);
    }
    if (colors.followUpButtonText) {
      root.style.setProperty('--heshev-follow-up-btn-text', colors.followUpButtonText);
    }
    if (colors.labelColor) {
      root.style.setProperty('--heshev-label-color', colors.labelColor);
    }
  }

  private render(): void {
    if (!this.root) return;

    const state = this.stateManager.getState();

    if (this.config.mode === 'embedded') {
      this.root.render(
        React.createElement(ChatContainer, {
          messages: state.messages,
          status: this.wsClient.status,
          serverStatus: state.serverStatus,
          isReady: state.isReady,
          theme: this.config.theme,
          rtl: this.config.rtl,
          texts: this.texts,
          onSend: this.handleSend.bind(this),
          isEmbedded: true,
          currentFollowUpQuestions: state.currentFollowUpQuestions,
        })
      );
    } else {
      // Render floating button
      if (this.floatingRoot) {
        this.floatingRoot.render(
          React.createElement(FloatingButton, {
            position: this.config.floatingPosition,
            onClick: this.toggle.bind(this),
            icon: this.config.floatingButtonIcon,
            text: this.config.floatingButtonText,
            isOpen: this.isOpen,
          })
        );
      }

      // Render chat overlay
      this.root.render(
        React.createElement(Overlay, {
          position: this.config.floatingPosition,
          isOpen: this.isOpen,
          children: React.createElement(ChatContainer, {
            messages: state.messages,
            status: this.wsClient.status,
            serverStatus: state.serverStatus,
            isReady: state.isReady,
            theme: this.config.theme,
            rtl: this.config.rtl,
            texts: this.texts,
            onSend: this.handleSend.bind(this),
            onClose: this.close.bind(this),
            showClose: true,
            isEmbedded: false,
            currentFollowUpQuestions: state.currentFollowUpQuestions,
          }),
        })
      );
    }
  }

  private handleSend(message: string): void {
    this.stateManager.clearFollowUpQuestions();
    const messageId = this.stateManager.addUserMessage(message);
    this.wsClient.send({
      type: 'message',
      payload: {
        content: message,
        messageId,
      },
    });
    this.render();
  }

  // Public API methods

  async connect(): Promise<void> {
    await this.wsClient.connect();
  }

  disconnect(): void {
    this.wsClient.disconnect();
  }

  async loadContext(jsonUrl: string): Promise<void> {
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`Failed to load context: ${response.statusText}`);
    }
    const data = await response.json();
    await this.loadContextData(data);
  }

  async loadContextData(data: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      const onReady = () => {
        this.wsClient.off('ready', onReady);
        this.wsClient.off('serverError', onError);
        resolve();
      };

      const onError = (error: { message: string }) => {
        this.wsClient.off('ready', onReady);
        this.wsClient.off('serverError', onError);
        reject(new Error(error.message));
      };

      this.wsClient.on('ready', onReady);
      this.wsClient.on('serverError', onError);

      this.wsClient.send({
        type: 'context',
        payload: {
          data,
          contextId: generateId(),
        },
      });
    });
  }

  /**
   * Load file content to be used as context
   * Can be called multiple times - replaces previous file content
   */
  async loadFile(content: string, filename?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const onReady = () => {
        this.wsClient.off('ready', onReady);
        this.wsClient.off('serverError', onError);
        resolve();
      };

      const onError = (error: { message: string }) => {
        this.wsClient.off('ready', onReady);
        this.wsClient.off('serverError', onError);
        reject(new Error(error.message));
      };

      this.wsClient.on('ready', onReady);
      this.wsClient.on('serverError', onError);

      this.wsClient.send({
        type: 'file',
        payload: {
          content,
          filename,
        },
      });
    });
  }

  /**
   * Load metadata (additional JSON data) to be included in system context
   * Can be called multiple times
   * @param data - JSON object or string
   * @param merge - If true, merges with existing metadata; if false, replaces it
   */
  async loadMetadata(data: Record<string, unknown> | string, merge = false): Promise<void> {
    return new Promise((resolve, reject) => {
      const onReady = () => {
        this.wsClient.off('ready', onReady);
        this.wsClient.off('serverError', onError);
        resolve();
      };

      const onError = (error: { message: string }) => {
        this.wsClient.off('ready', onReady);
        this.wsClient.off('serverError', onError);
        reject(new Error(error.message));
      };

      this.wsClient.on('ready', onReady);
      this.wsClient.on('serverError', onError);

      this.wsClient.send({
        type: 'metadata',
        payload: {
          data,
          merge,
        },
      });
    });
  }

  /**
   * Set or update system instructions
   * Can be called multiple times - replaces previous instructions
   */
  async setSystemInstructions(instructions: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const onReady = () => {
        this.wsClient.off('ready', onReady);
        this.wsClient.off('serverError', onError);
        resolve();
      };

      const onError = (error: { message: string }) => {
        this.wsClient.off('ready', onReady);
        this.wsClient.off('serverError', onError);
        reject(new Error(error.message));
      };

      this.wsClient.on('ready', onReady);
      this.wsClient.on('serverError', onError);

      this.wsClient.send({
        type: 'instructions',
        payload: {
          content: instructions,
        },
      });
    });
  }

  send(message: string): void {
    this.handleSend(message);
  }

  new(): void {
    this.stateManager.clearMessages();
    this.wsClient.send({ type: 'new_conversation' });
    this.render();
  }

  reset(): void {
    this.stateManager.reset();
    this.wsClient.send({ type: 'reset' });
    this.render();
  }

  addResponse(content: string): void {
    this.stateManager.addResponse(content);
    this.render();
  }

  saveState(): SavedState {
    return this.stateManager.saveState();
  }

  loadState(state: SavedState): void {
    this.stateManager.loadState(state);
    this.render();
  }

  export(): { messages: ChatMessage[]; tokenUsage: TokenUsage } {
    return this.stateManager.export();
  }

  // Floating mode controls

  open(): void {
    if (this.config.mode !== 'floating') return;
    this.isOpen = true;
    this.config.onOpen();
    this.emit('open');
    this.render();
  }

  close(): void {
    if (this.config.mode !== 'floating') return;
    this.isOpen = false;
    this.config.onClose();
    this.emit('close');
    this.render();
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  // Cleanup

  destroy(): void {
    this.disconnect();

    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (this.floatingRoot) {
      this.floatingRoot.unmount();
      this.floatingRoot = null;
    }

    if (this.config.mode === 'floating') {
      if (this.containerElement) {
        removeElement(this.containerElement);
        this.containerElement = null;
      }
      if (this.floatingElement) {
        removeElement(this.floatingElement);
        this.floatingElement = null;
      }
    }

    this.stateManager.clearPersistedState();
    this.removeAllListeners();
    this.isInitialized = false;
  }

  // Getters

  getMessages(): ChatMessage[] {
    return this.stateManager.getMessages();
  }

  getTokenUsage(): TokenUsage {
    return this.stateManager.getTokenUsage();
  }

  getStatus(): ConnectionStatus {
    return this.wsClient.status;
  }

  isReady(): boolean {
    return this.stateManager.getState().isReady;
  }

  isConnected(): boolean {
    return this.wsClient.isConnected();
  }
}
