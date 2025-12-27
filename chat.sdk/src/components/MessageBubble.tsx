import Markdown from 'react-markdown';
import type { ChatMessage, UITexts } from '../types/config';
import { useStreamingText } from '../hooks/useStreamingText';

interface MessageBubbleProps {
  message: ChatMessage;
  texts: UITexts;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function MessageBubble({ message, texts }: MessageBubbleProps) {
  const displayedText = useStreamingText({
    text: message.content,
    isStreaming: message.isStreaming ?? false,
  });

  const getBubbleClass = () => {
    const classes = ['heshev-chat__bubble'];

    switch (message.role) {
      case 'user':
        classes.push('heshev-chat__bubble--user');
        break;
      case 'assistant':
        classes.push('heshev-chat__bubble--assistant');
        break;
      case 'system':
        classes.push('heshev-chat__bubble--system');
        break;
    }

    if (message.isStreaming) {
      classes.push('heshev-chat__bubble--streaming');
    }

    return classes.join(' ');
  };

  const label = message.role === 'user' ? texts.userLabel : texts.assistantLabel;
  const timestamp = formatTime(message.timestamp);

  return (
    <div className={getBubbleClass()}>
      {message.role !== 'system' && (
        <div className="heshev-chat__bubble-header">
          <span className="heshev-chat__bubble-label">{label}</span>
          <span className="heshev-chat__bubble-timestamp">{timestamp}</span>
        </div>
      )}
      <div className="heshev-chat__bubble-content">
        {message.role === 'assistant' ? (
          <Markdown>{displayedText || message.content}</Markdown>
        ) : (
          displayedText || (message.isStreaming ? '' : message.content)
        )}
      </div>
    </div>
  );
}
