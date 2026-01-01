import { EventEmitter } from './EventEmitter';
import type { ClientMessage, ServerMessage } from '../types/websocket';
import type { ConnectionStatus } from '../types/config';

export interface WebSocketClientOptions {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number;
  private reconnectDelay: number;
  private pingInterval: number;
  private currentReconnectAttempt = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string | null = null;
  private _status: ConnectionStatus = 'disconnected';

  constructor(options: WebSocketClientOptions) {
    super();
    this.url = options.url;
    this.reconnectAttempts = options.reconnectAttempts ?? 5;
    this.reconnectDelay = options.reconnectDelay ?? 3000;
    this.pingInterval = options.pingInterval ?? 30000;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  private setStatus(status: ConnectionStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.emit('statusChange', status);
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setStatus('connecting');

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.currentReconnectAttempt = 0;
          this.setStatus('connected');
          this.startPing();
          this.emit('open');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string) as ServerMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          this.stopPing();
          this.setStatus('disconnected');
          this.emit('close', event.code, event.reason);

          // Attempt reconnect if not a clean close
          if (event.code !== 1000 && this.currentReconnectAttempt < this.reconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = () => {
          this.setStatus('error');
          const error = new Error('WebSocket connection error');
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        this.setStatus('error');
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.cancelReconnect();
    this.stopPing();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message.type);
    }
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'connected':
        this.sessionId = message.payload.sessionId;
        this.emit('connected', message.payload);
        break;
      case 'ready':
        this.emit('ready', message.payload);
        break;
      case 'status':
        this.emit('serverStatus', message.payload.status, message.payload.message);
        break;
      case 'stream':
        this.emit('stream', message.payload.chunk, message.payload.messageId);
        break;
      case 'complete':
        this.emit('complete', message.payload);
        break;
      case 'error':
        this.emit('serverError', message.payload);
        break;
      case 'pong':
        // Pong received, connection is alive
        break;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, this.pingInterval);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.cancelReconnect();
    this.currentReconnectAttempt++;

    const delay = this.reconnectDelay * Math.pow(2, this.currentReconnectAttempt - 1);

    this.reconnectTimeout = setTimeout(() => {
      this.emit('reconnecting', this.currentReconnectAttempt, this.reconnectAttempts);
      this.connect().catch(() => {
        // Error handled in connect()
      });
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
