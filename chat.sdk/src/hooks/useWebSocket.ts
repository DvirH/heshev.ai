import { useState, useEffect, useCallback } from 'react';
import type { ConnectionStatus } from '../types/config';
import type { WebSocketClient } from '../core/WebSocketClient';

export function useWebSocket(wsClient: WebSocketClient) {
  const [status, setStatus] = useState<ConnectionStatus>(wsClient.status);

  useEffect(() => {
    const handleStatusChange = (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
    };

    wsClient.on('statusChange', handleStatusChange);

    return () => {
      wsClient.off('statusChange', handleStatusChange);
    };
  }, [wsClient]);

  const connect = useCallback(() => {
    return wsClient.connect();
  }, [wsClient]);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
  }, [wsClient]);

  const isConnected = status === 'connected';

  return {
    status,
    isConnected,
    connect,
    disconnect,
  };
}
