import type { ConversationMessage, TokenUsage } from '../types/index.ts';

export interface CompletionResponse {
  content: string;
  tokenUsage: TokenUsage;
  model: string;
  finishReason: string;
}

export interface StreamCompletionParams {
  messages: ConversationMessage[];
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  onChunk: (chunk: string) => void;
  onComplete: (response: CompletionResponse) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export interface LLMProvider {
  streamCompletion(params: StreamCompletionParams): void;
}

export { GeminiProvider, geminiProvider } from './gemini.ts';
