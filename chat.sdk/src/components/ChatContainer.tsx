import type { ChatMessage, ConnectionStatus, Theme, UITexts } from '../types/config';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';

interface ChatContainerProps {
  messages: ChatMessage[];
  status: ConnectionStatus;
  serverStatus: 'idle' | 'typing' | 'processing';
  isReady: boolean;
  theme: Theme;
  rtl?: boolean;
  texts: UITexts;
  onSend: (message: string) => void;
  onClose?: () => void;
  showClose?: boolean;
  isEmbedded?: boolean;
}

export function ChatContainer({
  messages,
  status,
  serverStatus,
  isReady,
  theme,
  rtl = false,
  texts,
  onSend,
  onClose,
  showClose = false,
  isEmbedded = true,
}: ChatContainerProps) {
  const themeClass = theme === 'dark'
    ? 'heshev-chat--dark'
    : theme === 'auto'
      ? 'heshev-chat--auto'
      : '';

  const modeClass = isEmbedded ? 'heshev-chat--embedded' : '';
  const rtlClass = rtl ? 'heshev-chat--rtl' : '';

  const containerClass = `heshev-chat ${themeClass} ${modeClass} ${rtlClass}`.trim();

  const isConnected = status === 'connected';
  const canSend = isConnected && isReady && serverStatus !== 'typing';

  // Server status banner
  const showServerStatus = serverStatus === 'processing';

  return (
    <div className={containerClass} dir={rtl ? 'rtl' : 'ltr'}>
      <ChatHeader
        title={texts.title}
        status={status}
        onClose={onClose}
        showClose={showClose}
        closeButtonLabel={texts.closeButton}
        texts={texts}
      />

      {showServerStatus && (
        <div className="heshev-chat__server-status heshev-chat__server-status--processing">
          <span className="heshev-chat__spinner" />
          <span>{texts.processing}</span>
        </div>
      )}

      <MessageList messages={messages} serverStatus={serverStatus} texts={texts} />

      <InputArea
        onSend={onSend}
        disabled={!canSend}
        placeholder={!isConnected ? texts.placeholderConnecting : !isReady ? texts.placeholderLoading : texts.placeholder}
      />
    </div>
  );
}
