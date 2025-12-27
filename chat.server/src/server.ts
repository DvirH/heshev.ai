import express, { Express } from 'express';
import { createServer, Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './utils/config.ts';
import { logger } from './utils/logger.ts';
import { setupWebSocketHandlers } from './websocket/handler.ts';
import { sessionManager } from './websocket/sessionManager.ts';

interface ChatServerResult {
  app: Express;
  server: Server;
  wss: WebSocketServer;
}

export function createChatServer(): ChatServerResult {
  const app = express();

  // Middleware
  app.use(express.json());

  // CORS handling
  app.use((req, res, next) => {
    const origin = config.corsOrigin;
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    const stats = sessionManager.getStats();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      sessions: stats,
    });
  });

  // Create HTTP server
  const server = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({
    server,
    path: config.wsPath,
  });

  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    setupWebSocketHandlers(ws);
  });

  // Heartbeat to keep connections alive and detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    });
  }, 30000);

  // Cleanup on server close
  server.on('close', () => {
    clearInterval(heartbeatInterval);
    sessionManager.shutdown();
  });

  return { app, server, wss };
}

export function startServer(): Server {
  const { server } = createChatServer();

  server.listen(config.port, () => {
    logger.info(`Chat server started`, {
      port: config.port,
      wsPath: config.wsPath,
      model: config.defaultModel,
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  return server;
}
