import { EventEmitter } from './EventEmitter';
import type { ChatMessage, ChatState, TokenUsage, SavedState } from '../types/config';
import { loadFromStorage, saveToStorage, removeFromStorage } from '../utils/storage';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'heshev-chat-state';

export class StateManager extends EventEmitter {
  private state: ChatState;
  private streamingMessageId: string | null = null;

  constructor() {
    super();
    this.state = this.getInitialState();
  }

  private getInitialState(): ChatState {
    return {
      messages: [],
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      isConnected: false,
      isReady: false,
      serverStatus: 'idle',
    };
  }

  getState(): ChatState {
    return { ...this.state };
  }

  getMessages(): ChatMessage[] {
    return [...this.state.messages];
  }

  getTokenUsage(): TokenUsage {
    return { ...this.state.tokenUsage };
  }

  setConnected(connected: boolean): void {
    this.state.isConnected = connected;
    if (!connected) {
      this.state.isReady = false;
    }
    this.emit('stateChange', this.getState());
  }

  setReady(ready: boolean): void {
    this.state.isReady = ready;
    this.emit('stateChange', this.getState());
  }

  setServerStatus(status: ChatState['serverStatus']): void {
    this.state.serverStatus = status;
    this.emit('stateChange', this.getState());
  }

  addUserMessage(content: string): string {
    const messageId = generateId();
    const message: ChatMessage = {
      id: messageId,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    this.state.messages.push(message);
    this.emit('messageAdded', message);
    this.emit('stateChange', this.getState());
    return messageId;
  }

  startAssistantMessage(messageId: string): void {
    const message: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    this.state.messages.push(message);
    this.streamingMessageId = messageId;
    this.emit('messageAdded', message);
    this.emit('stateChange', this.getState());
  }

  appendToStreamingMessage(chunk: string): void {
    if (!this.streamingMessageId) return;

    const message = this.state.messages.find(m => m.id === this.streamingMessageId);
    if (message) {
      message.content += chunk;
      this.emit('messageUpdated', message);
      this.emit('stateChange', this.getState());
    }
  }

  completeStreamingMessage(content: string, tokenUsage: TokenUsage, followUpQuestions?: string[]): void {
    // If no streaming message exists, create one first
    // (happens when follow-up questions are enabled and streaming is skipped)
    if (!this.streamingMessageId) {
      const messageId = generateId();
      this.startAssistantMessage(messageId);
    }

    const message = this.state.messages.find(m => m.id === this.streamingMessageId);
    if (message) {
      message.content = content;
      message.isStreaming = false;
      message.followUpQuestions = followUpQuestions;
      this.emit('messageUpdated', message);
    }

    // Update token usage
    this.state.tokenUsage.prompt += tokenUsage.prompt;
    this.state.tokenUsage.completion += tokenUsage.completion;
    this.state.tokenUsage.total += tokenUsage.total;

    // Update current follow-up questions
    this.state.currentFollowUpQuestions = followUpQuestions;

    this.streamingMessageId = null;
    this.emit('stateChange', this.getState());
  }

  clearFollowUpQuestions(): void {
    this.state.currentFollowUpQuestions = undefined;
    this.emit('stateChange', this.getState());
  }

  addResponse(content: string): void {
    const message: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
    this.state.messages.push(message);
    this.emit('messageAdded', message);
    this.emit('stateChange', this.getState());
  }

  addSystemMessage(content: string): void {
    const message: ChatMessage = {
      id: generateId(),
      role: 'system',
      content,
      timestamp: new Date(),
    };
    this.state.messages.push(message);
    this.emit('messageAdded', message);
    this.emit('stateChange', this.getState());
  }

  clearMessages(): void {
    this.state.messages = [];
    this.state.tokenUsage = { prompt: 0, completion: 0, total: 0 };
    this.streamingMessageId = null;
    this.emit('stateChange', this.getState());
  }

  reset(): void {
    this.state = this.getInitialState();
    this.streamingMessageId = null;
    this.emit('stateChange', this.getState());
  }

  saveState(): SavedState {
    const savedState: SavedState = {
      messages: this.state.messages.map(m => ({
        ...m,
        timestamp: m.timestamp,
      })),
      tokenUsage: { ...this.state.tokenUsage },
      timestamp: new Date().toISOString(),
    };

    // Also persist to localStorage
    saveToStorage(STORAGE_KEY, savedState);

    return savedState;
  }

  loadState(savedState: SavedState): void {
    this.state.messages = savedState.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
      isStreaming: false,
    }));
    this.state.tokenUsage = { ...savedState.tokenUsage };
    this.streamingMessageId = null;
    this.emit('stateChange', this.getState());
  }

  loadPersistedState(): boolean {
    const saved = loadFromStorage<SavedState>(STORAGE_KEY);
    if (saved) {
      this.loadState(saved);
      return true;
    }
    return false;
  }

  clearPersistedState(): void {
    removeFromStorage(STORAGE_KEY);
  }

  export(): { messages: ChatMessage[]; tokenUsage: TokenUsage } {
    return {
      messages: this.getMessages(),
      tokenUsage: this.getTokenUsage(),
    };
  }

  isStreaming(): boolean {
    return this.streamingMessageId !== null;
  }

  getStreamingMessageId(): string | null {
    return this.streamingMessageId;
  }
}
