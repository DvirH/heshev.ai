import { logger } from '../utils/logger.ts';
import type { Session } from '../types/session.ts';
import {
  shouldGenerateQuestions,
  getQuestionCount,
  buildFollowUpInstruction,
} from '../llm/followUpQuestions.ts';

// Default Hebrew system instructions for accountant assistant
const DEFAULT_SYSTEM_INSTRUCTIONS = `אתה רואה חשבון מקצועי.
ענה על שאלות בעברית בלבד.
ענה רק על סמך המידע מהקובץ המצורף והמידע הנוסף שסופק.
אם התשובה לא נמצאת במידע שסופק, אמור זאת בבירור.`;

export interface ProcessedContext {
  systemPrompt: string;
  documents?: Array<{
    title?: string;
    content: string;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Processes raw context data into a format suitable for the LLM
 */
export function processContext(data: Record<string, unknown>): ProcessedContext {
  const result: ProcessedContext = {
    systemPrompt: '',
  };

  // Handle system prompt
  if (typeof data.system === 'string') {
    result.systemPrompt = data.system;
  } else if (typeof data.systemPrompt === 'string') {
    result.systemPrompt = data.systemPrompt;
  }

  // Handle documents array
  if (Array.isArray(data.documents)) {
    result.documents = data.documents.map((doc: unknown) => {
      if (typeof doc === 'string') {
        return { content: doc };
      }
      if (typeof doc === 'object' && doc !== null) {
        const docObj = doc as Record<string, unknown>;
        return {
          title: typeof docObj.title === 'string' ? docObj.title : undefined,
          content: typeof docObj.content === 'string' ? docObj.content : JSON.stringify(doc),
        };
      }
      return { content: String(doc) };
    });
  }

  // Store any additional metadata
  const { system, systemPrompt, documents, ...rest } = data;
  if (Object.keys(rest).length > 0) {
    result.metadata = rest;
  }

  logger.debug('Context processed', {
    hasSystemPrompt: !!result.systemPrompt,
    documentCount: result.documents?.length ?? 0,
  });

  return result;
}

/**
 * Builds a system message from processed context
 */
export function buildSystemMessage(context: ProcessedContext): string {
  const parts: string[] = [];

  if (context.systemPrompt) {
    parts.push(context.systemPrompt);
  }

  if (context.documents && context.documents.length > 0) {
    parts.push('\n\n--- Reference Documents ---\n');
    context.documents.forEach((doc, index) => {
      if (doc.title) {
        parts.push(`\n[Document ${index + 1}: ${doc.title}]\n${doc.content}\n`);
      } else {
        parts.push(`\n[Document ${index + 1}]\n${doc.content}\n`);
      }
    });
  }

  return parts.join('');
}

/**
 * Builds a full system message from session context
 * This is the main function to use for building the system prompt
 */
export function buildSessionSystemMessage(session: Session): string {
  const parts: string[] = [];

  // 1. Add system instructions (custom or default)
  const instructions = session.systemInstructions || DEFAULT_SYSTEM_INSTRUCTIONS;
  parts.push(instructions);

  // 2. Process context if exists
  if (session.context) {
    const processed = processContext(session.context);
    if (processed.systemPrompt && !session.systemInstructions) {
      // Only use context system prompt if no custom instructions set
      parts[0] = processed.systemPrompt;
    }
    if (processed.documents && processed.documents.length > 0) {
      parts.push('\n\n--- Reference Documents ---\n');
      processed.documents.forEach((doc, index) => {
        if (doc.title) {
          parts.push(`\n[Document ${index + 1}: ${doc.title}]\n${doc.content}\n`);
        } else {
          parts.push(`\n[Document ${index + 1}]\n${doc.content}\n`);
        }
      });
    }
    // Add context metadata if exists
    if (processed.metadata && Object.keys(processed.metadata).length > 0) {
      parts.push(`\n\n--- Additional Data ---\n${JSON.stringify(processed.metadata, null, 2)}`);
    }
  }

  // 3. Add follow-up questions instruction if enabled
  if (shouldGenerateQuestions(session)) {
    const count = getQuestionCount(session);
    parts.push('\n\n' + buildFollowUpInstruction(count));
  }

  const fullMessage = parts.join('');

  logger.debug('Session system message built', {
    sessionId: session.id,
    hasCustomInstructions: !!session.systemInstructions,
    hasContext: !!session.context,
    messageLength: fullMessage.length,
  });

  return fullMessage;
}
