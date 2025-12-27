import type { FloatingPosition } from '../types/config';

interface FloatingButtonProps {
  position: FloatingPosition;
  onClick: () => void;
  icon?: string;
  text?: string;
  isOpen: boolean;
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

export function FloatingButton({ position, onClick, icon, text, isOpen }: FloatingButtonProps) {
  const positionClass = position === 'bottom-left'
    ? 'heshev-chat__floating-btn--bottom-left'
    : 'heshev-chat__floating-btn--bottom-right';

  return (
    <button
      className={`heshev-chat__floating-btn ${positionClass}`}
      onClick={onClick}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      {isOpen ? (
        <CloseIcon />
      ) : icon ? (
        <span dangerouslySetInnerHTML={{ __html: icon }} />
      ) : text ? (
        <span>{text}</span>
      ) : (
        <ChatIcon />
      )}
    </button>
  );
}
