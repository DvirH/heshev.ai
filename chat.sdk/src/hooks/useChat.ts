import { useState, useEffect } from 'react';
import type { ChatState, ChatMessage } from '../types/config';
import type { StateManager } from '../core/StateManager';

export function useChat(stateManager: StateManager) {
  const [state, setState] = useState<ChatState>(stateManager.getState());

  useEffect(() => {
    const handleStateChange = (newState: ChatState) => {
      setState({ ...newState });
    };

    stateManager.on('stateChange', handleStateChange);

    return () => {
      stateManager.off('stateChange', handleStateChange);
    };
  }, [stateManager]);

  const messages = state.messages;
  const isConnected = state.isConnected;
  const isReady = state.isReady;
  const serverStatus = state.serverStatus;
  const tokenUsage = state.tokenUsage;

  return {
    messages,
    isConnected,
    isReady,
    serverStatus,
    tokenUsage,
    state,
  };
}

export function useChatMessages(stateManager: StateManager) {
  const [messages, setMessages] = useState<ChatMessage[]>(stateManager.getMessages());

  useEffect(() => {
    const handleStateChange = () => {
      setMessages(stateManager.getMessages());
    };

    stateManager.on('stateChange', handleStateChange);

    return () => {
      stateManager.off('stateChange', handleStateChange);
    };
  }, [stateManager]);

  return messages;
}
