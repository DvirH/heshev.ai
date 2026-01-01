import express, { Express } from 'express';
import { createServer, Server, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './utils/config.ts';
import { logger } from './utils/logger.ts';
import { setupWebSocketHandlers } from './websocket/handler.ts';
import { sessionManager } from './websocket/sessionManager.ts';
import { sessionRoutes } from './api/sessionRoutes.ts';
import { apiKeyAuth } from './middleware/apiKeyAuth.ts';

interface ChatServerResult {
  app: Express;
  server: Server;
  wss: WebSocketServer;
}

export function createChatServer(): ChatServerResult {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '2mb' }));

  // CORS handling
  app.use((req, res, next) => {
    const origin = config.corsOrigin;
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-api-secret');

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

  // API routes with authentication
  app.use('/api', apiKeyAuth, sessionRoutes);

  // Create HTTP server
  const server = createServer(app);

  // Create WebSocket server with noServer mode for manual upgrade handling
  const wss = new WebSocketServer({
    noServer: true,
  });

  // Handle HTTP upgrade requests manually
  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Expected: /ws/:sessionId
    if (pathParts[0] !== config.wsPath.replace('/', '') || pathParts.length !== 2) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const sessionId = pathParts[1];

    // Validate session exists
    if (!sessionManager.exists(sessionId)) {
      socket.write('HTTP/1.1 404 Session Not Found\r\n\r\n');
      socket.destroy();
      logger.warn('WebSocket connection rejected - session not found', { sessionId });
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      // Attach WebSocket to session
      sessionManager.attachWebSocket(sessionId, ws);
      wss.emit('connection', ws, request, sessionId);
    });
  });

  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket, _request: IncomingMessage, sessionId: string) => {
    setupWebSocketHandlers(ws, sessionId);
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
