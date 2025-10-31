"use client";

import { useCallback } from 'react';
import { useStreamingChat } from './use-streaming-chat';

interface ChatMessagesHook {
  messages: any[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string, options?: {
    web_search?: boolean;
    rag?: boolean;
    deep_search?: boolean;
    uploaded_doc?: boolean;
    model?: string;
  }) => Promise<void>;
  clearMessages: () => void;
  addMessage: (message: { role: 'user' | 'assistant'; content: string; timestamp: string; isStreaming?: boolean; imageUrls?: string[] }) => void;
}

export function useChatMessages(sessionId: string | null): ChatMessagesHook {
  const { messages, isLoading, error, sendMessage, clearMessages, addMessage } = useStreamingChat(sessionId || '');

  const handleSendMessage = useCallback(async (message: string, options: {
    web_search?: boolean;
    rag?: boolean;
    deep_search?: boolean;
    uploaded_doc?: boolean;
    model?: string;
  } = {}) => {
    if (!sessionId) {
      console.error('No session ID available');
      return;
    }

    await sendMessage({
      message,
      ...options,
    });
  }, [sessionId, sendMessage]);

  const handleAddMessage = useCallback((message: { role: 'user' | 'assistant'; content: string; timestamp: string; isStreaming?: boolean; imageUrls?: string[] }) => {
    addMessage(message);
  }, [addMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage: handleSendMessage,
    clearMessages,
    addMessage: handleAddMessage,
  };
}
