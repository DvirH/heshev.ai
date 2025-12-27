// Main SDK export
export { HeshevChat } from './HeshevChat';

// Type exports
export type {
  HeshevChatConfig,
  ChatMessage,
  TokenUsage,
  SavedState,
  ChatState,
  ConnectionStatus,
  DisplayMode,
  FloatingPosition,
  Theme,
} from './types/config';

export type {
  Message,
  ExportData,
} from './types/messages';

// Re-export for UMD bundle
import { HeshevChat } from './HeshevChat';
export default HeshevChat;

// Global export for script tag usage
if (typeof window !== 'undefined') {
  (window as unknown as { HeshevChat: typeof HeshevChat }).HeshevChat = HeshevChat;
}
