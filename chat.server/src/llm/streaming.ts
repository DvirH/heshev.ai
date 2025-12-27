import type { WebSocket } from 'ws';
import type { Session } from '../types/index.ts';
import type { StreamMessage, CompleteMessage, StatusMessage, ErrorMessage, ServerMessage } from '../types/messages.ts';
import { geminiProvider, type CompletionResponse } from './index.ts';
import { sessionManager } from '../websocket/sessionManager.ts';
import { buildSessionSystemMessage } from '../context/contextManager.ts';
import { logger } from '../utils/logger.ts';
import { parseResponseWithQuestions, shouldGenerateQuestions } from './followUpQuestions.ts';

function sendMessage(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export interface StreamChatParams {
  session: Session;
  userMessage: string;
  messageId: string;
}

export function streamChatResponse(params: StreamChatParams): void {
  const { session, userMessage, messageId } = params;
  const { ws } = session;

  // Check if follow-up questions are enabled (affects streaming behavior)
  const generateFollowUp = shouldGenerateQuestions(session);

  // Create abort controller for this stream
  const abortController = new AbortController();
  sessionManager.setActiveStream(session.id, abortController);

  // Send typing status
  const typingStatus: StatusMessage = {
    type: 'status',
    payload: { status: 'typing' },
  };
  sendMessage(ws, typingStatus);

  // Add user message to history
  sessionManager.addMessage(session.id, {
    role: 'user',
    content: userMessage,
    messageId,
    timestamp: new Date(),
  });

  // Build system prompt from session (includes instructions, file content, metadata)
  const systemPrompt = buildSessionSystemMessage(session);

  // Stream completion
  geminiProvider.streamCompletion({
    messages: session.conversationHistory,
    systemPrompt,
    signal: abortController.signal,
    onChunk: (chunk: string) => {
      // Skip streaming chunks when follow-up questions are enabled
      // (the response contains JSON that needs to be parsed first)
      if (generateFollowUp) {
        return;
      }
      const streamMsg: StreamMessage = {
        type: 'stream',
        payload: { chunk, messageId },
      };
      sendMessage(ws, streamMsg);
    },
    onComplete: (response: CompletionResponse) => {
      // Clear active stream
      sessionManager.setActiveStream(session.id, undefined);

      // Parse response for follow-up questions if enabled
      let finalContent = response.content;
      let followUpQuestions: string[] = [];

      if (generateFollowUp) {
        const parsed = parseResponseWithQuestions(response.content);
        finalContent = parsed.content;
        followUpQuestions = parsed.questions;
      }

      // Add assistant message to history (with parsed content)
      sessionManager.addMessage(session.id, {
        role: 'assistant',
        content: finalContent,
        messageId,
        timestamp: new Date(),
      });

      // Update token usage
      sessionManager.updateTokenUsage(
        session.id,
        response.tokenUsage.prompt,
        response.tokenUsage.completion
      );

      // Send complete message with follow-up questions
      const completeMsg: CompleteMessage = {
        type: 'complete',
        payload: {
          messageId,
          content: finalContent,
          tokenUsage: response.tokenUsage,
          metadata: {
            model: response.model,
            finishReason: response.finishReason,
          },
          followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : undefined,
        },
      };
      sendMessage(ws, completeMsg);

      // Send idle status
      const idleStatus: StatusMessage = {
        type: 'status',
        payload: { status: 'idle' },
      };
      sendMessage(ws, idleStatus);

      logger.info('Chat response completed', {
        sessionId: session.id,
        messageId,
        tokenUsage: response.tokenUsage,
      });
    },
    onError: (error: Error) => {
      // Clear active stream
      sessionManager.setActiveStream(session.id, undefined);

      // Determine error code
      const isAborted = error.message === 'Request aborted';
      const errorCode = isAborted ? 'STREAM_ABORTED' : 'SERVER_ERROR';

      const errorMsg: ErrorMessage = {
        type: 'error',
        payload: {
          code: errorCode,
          message: error.message,
          messageId,
          retryable: !isAborted,
        },
      };
      sendMessage(ws, errorMsg);

      // Send idle status
      const idleStatus: StatusMessage = {
        type: 'status',
        payload: { status: 'idle' },
      };
      sendMessage(ws, idleStatus);

      if (!isAborted) {
        logger.error('Chat stream error', error, { sessionId: session.id, messageId });
      }
    },
  });
}

export function abortStream(session: Session): void {
  if (session.activeStreamController) {
    session.activeStreamController.abort();
    sessionManager.setActiveStream(session.id, undefined);
    logger.debug('Stream aborted', { sessionId: session.id });
  }
}
