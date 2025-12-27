import { useEffect, useRef } from 'react';
import type { ChatMessage, UITexts } from '../types/config';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
  serverStatus: 'idle' | 'typing' | 'processing';
  texts: UITexts;
}

function TypingIndicator() {
  return (
    <div className="heshev-chat__typing">
      <span className="heshev-chat__typing-dot" />
      <span className="heshev-chat__typing-dot" />
      <span className="heshev-chat__typing-dot" />
    </div>
  );
}

function EmptyState({ texts }: { texts: UITexts }) {
  return (
    <div className="heshev-chat__empty-state">
      <div className="heshev-chat__empty-state-icon">💬</div>
      <p>{texts.emptyStateTitle}</p>
      <p>{texts.emptyStateSubtitle}</p>
    </div>
  );
}

export function MessageList({ messages, serverStatus, texts }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, serverStatus]);

  const isEmpty = messages.length === 0;
  const showTyping = serverStatus === 'typing' && !messages.some(m => m.isStreaming);

  const containerClass = isEmpty
    ? 'heshev-chat__messages heshev-chat__messages--empty'
    : 'heshev-chat__messages';

  return (
    <div className={containerClass} ref={containerRef}>
      {isEmpty ? (
        <EmptyState texts={texts} />
      ) : (
        <>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {showTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
