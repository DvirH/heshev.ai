import type { ConnectionStatus, UITexts } from '../types/config';
import { StatusIndicator } from './StatusIndicator';

interface ChatHeaderProps {
  title: string;
  status: ConnectionStatus;
  onClose?: () => void;
  showClose?: boolean;
  closeButtonLabel: string;
  texts: UITexts;
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

export function ChatHeader({ title, status, onClose, showClose = false, closeButtonLabel, texts }: ChatHeaderProps) {
  return (
    <div className="heshev-chat__header">
      <div className="heshev-chat__header-left">
        <h2 className="heshev-chat__header-title">{title}</h2>
        <StatusIndicator status={status} showLabel={false} texts={texts} />
      </div>
      <div className="heshev-chat__header-actions">
        {showClose && onClose && (
          <button
            className="heshev-chat__header-btn"
            onClick={onClose}
            aria-label={closeButtonLabel}
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  );
}
