import type { ChatMessage } from '../types/config';
import { useStreamingText } from '../hooks/useStreamingText';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
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

  return (
    <div className={getBubbleClass()}>
      {displayedText || (message.isStreaming ? '' : message.content)}
    </div>
  );
}
