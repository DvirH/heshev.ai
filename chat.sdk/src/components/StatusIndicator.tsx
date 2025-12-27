import type { ConnectionStatus, UITexts } from '../types/config';

interface StatusIndicatorProps {
  status: ConnectionStatus;
  showLabel?: boolean;
  texts: UITexts;
}

export function StatusIndicator({ status, showLabel = true, texts }: StatusIndicatorProps) {
  const getStatusLabel = () => {
    switch (status) {
      case 'connected':
        return texts.statusConnected;
      case 'connecting':
        return texts.statusConnecting;
      case 'disconnected':
        return texts.statusDisconnected;
      case 'error':
        return texts.statusError;
      default:
        return '';
    }
  };

  const getDotClass = () => {
    const baseClass = 'heshev-chat__status-dot';
    switch (status) {
      case 'connected':
        return `${baseClass} heshev-chat__status-dot--connected`;
      case 'connecting':
        return `${baseClass} heshev-chat__status-dot--connecting`;
      default:
        return baseClass;
    }
  };

  return (
    <div className="heshev-chat__status">
      <span className={getDotClass()} />
      {showLabel && <span>{getStatusLabel()}</span>}
    </div>
  );
}
