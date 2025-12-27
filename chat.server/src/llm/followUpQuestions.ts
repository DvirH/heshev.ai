import { logger } from '../utils/logger.ts';
import { config } from '../utils/config.ts';
import type { Session } from '../types/session.ts';

export interface ParsedResponse {
  content: string;
  questions: string[];
}

const FOLLOW_UP_INSTRUCTION_HE = `
לאחר התשובה שלך, צור {count} שאלות המשך שהמשתמש עשוי לרצות לשאול.
הגב בפורמט JSON בלבד:
{
  "response": "התשובה שלך כאן",
  "questions": ["שאלה 1?", "שאלה 2?", "שאלה 3?"]
}
חשוב: החזר JSON תקין בלבד, ללא בלוקים של קוד או טקסט נוסף.`;

/**
 * Builds the follow-up instruction to append to the system prompt
 */
export function buildFollowUpInstruction(count: number): string {
  return FOLLOW_UP_INSTRUCTION_HE.replace('{count}', count.toString());
}

/**
 * Parses the LLM response to extract content and follow-up questions
 * Falls back to returning raw content if JSON parsing fails
 */
export function parseResponseWithQuestions(rawContent: string): ParsedResponse {
  try {
    // Try to parse as JSON directly
    const parsed = JSON.parse(rawContent);

    if (typeof parsed.response === 'string' && Array.isArray(parsed.questions)) {
      const questions = parsed.questions
        .filter((q: unknown) => typeof q === 'string' && q.trim().length > 0)
        .slice(0, config.followUpQuestionsCount);

      logger.debug('Successfully parsed response with questions', {
        questionCount: questions.length,
      });

      return {
        content: parsed.response,
        questions,
      };
    }
  } catch {
    // Try to extract JSON from response (in case of markdown code blocks)
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (typeof parsed.response === 'string' && Array.isArray(parsed.questions)) {
          const questions = parsed.questions
            .filter((q: unknown) => typeof q === 'string' && q.trim().length > 0)
            .slice(0, config.followUpQuestionsCount);

          logger.debug('Extracted JSON from code block', {
            questionCount: questions.length,
          });

          return {
            content: parsed.response,
            questions,
          };
        }
      } catch {
        logger.debug('Failed to parse JSON from code block');
      }
    }

    logger.debug('Response is not valid JSON, returning as plain content');
  }

  // Fallback: return raw content without questions
  return {
    content: rawContent,
    questions: [],
  };
}

/**
 * Checks if follow-up questions should be generated for this session
 */
export function shouldGenerateQuestions(session: Session): boolean {
  // Check session-level override
  if (session.metadata?.disableFollowUpQuestions === true) {
    return false;
  }

  // Check global config
  return config.followUpQuestionsEnabled;
}

/**
 * Gets the number of questions to generate for this session
 */
export function getQuestionCount(session: Session): number {
  // Allow session-level override
  const sessionCount = session.metadata?.followUpQuestionsCount;
  if (typeof sessionCount === 'number' && sessionCount >= 1 && sessionCount <= 5) {
    return sessionCount;
  }
  return config.followUpQuestionsCount;
}
