export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ExportData {
  messages: Message[];
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  exportedAt: string;
}
