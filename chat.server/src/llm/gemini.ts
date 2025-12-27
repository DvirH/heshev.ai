import { GoogleGenAI, type Content } from '@google/genai';
import type { LLMProvider, StreamCompletionParams, CompletionResponse } from './index.ts';
import type { ConversationMessage } from '../types/index.ts';
import { config } from '../utils/config.ts';
import { logger } from '../utils/logger.ts';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey ?? config.googleApiKey;
    if (!key) {
      throw new Error('Google API key is required');
    }
    this.client = new GoogleGenAI({ apiKey: key });
  }

  private convertToGeminiContents(
    messages: ConversationMessage[]
  ): { contents: Content[]; lastMessage: string } {
    const contents: Content[] = [];
    let lastMessage = '';

    // Filter out system messages as Gemini handles system prompt separately
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    for (let i = 0; i < nonSystemMessages.length; i++) {
      const msg = nonSystemMessages[i];
      const role = msg.role === 'assistant' ? 'model' : 'user';

      if (i === nonSystemMessages.length - 1 && role === 'user') {
        // Last message should be sent separately
        lastMessage = msg.content;
      } else {
        contents.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    }

    return { contents, lastMessage };
  }

  async streamCompletion(params: StreamCompletionParams): Promise<void> {
    const {
      messages,
      systemPrompt,
      model,
      maxTokens,
      temperature,
      onChunk,
      onComplete,
      onError,
      signal,
    } = params;

    try {
      const { contents, lastMessage } = this.convertToGeminiContents(messages);

      // Add the last user message to contents
      const allContents: Content[] = [
        ...contents,
        { role: 'user', parts: [{ text: lastMessage }] }
      ];

      // Check if aborted before starting
      if (signal?.aborted) {
        onError(new Error('Request aborted'));
        return;
      }

      const modelName = model ?? config.defaultModel;

      // Stream the response using models.generateContentStream
      const response = await this.client.models.generateContentStream({
        model: modelName,
        contents: allContents,
        config: {
          maxOutputTokens: maxTokens ?? config.maxTokens,
          temperature: temperature ?? config.temperature,
          systemInstruction: systemPrompt || undefined,
        },
      });

      let fullContent = '';
      let promptTokens = 0;
      let completionTokens = 0;
      let finishReason = 'STOP';

      for await (const chunk of response) {
        // Check for abort
        if (signal?.aborted) {
          onError(new Error('Request aborted'));
          return;
        }

        const text = chunk.text;
        if (text) {
          fullContent += text;
          onChunk(text);
        }

        // Get token counts if available
        if (chunk.usageMetadata) {
          promptTokens = chunk.usageMetadata.promptTokenCount ?? 0;
          completionTokens = chunk.usageMetadata.candidatesTokenCount ?? 0;
        }

        // Get finish reason if available
        if (chunk.candidates?.[0]?.finishReason) {
          finishReason = chunk.candidates[0].finishReason;
        }
      }

      const completionResponse: CompletionResponse = {
        content: fullContent,
        tokenUsage: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens,
        },
        model: modelName,
        finishReason,
      };

      onComplete(completionResponse);

      logger.debug('Gemini completion finished', {
        model: modelName,
        promptTokens,
        completionTokens,
        finishReason,
      });
    } catch (error) {
      logger.error('Gemini completion error', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Singleton instance - will be initialized when first used
let _geminiProvider: GeminiProvider | null = null;

export const geminiProvider: LLMProvider = {
  streamCompletion(params: StreamCompletionParams): void {
    if (!_geminiProvider) {
      _geminiProvider = new GeminiProvider();
    }
    _geminiProvider.streamCompletion(params);
  },
};
