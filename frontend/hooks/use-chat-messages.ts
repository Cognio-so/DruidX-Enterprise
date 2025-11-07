"use client";

import { useCallback } from 'react';
import { useStreamingChat } from './use-streaming-chat';

interface ApprovalRequest {
  plan: string[];
  total_questions: number;
}

interface StatusPhase {
  phase: string;
  message: string;
  [key: string]: any;
}

interface WebSearchStatus {
  isActive: boolean;
  message: string;
  progress?: number;
}

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
    composio_tools?: string[];
    image?: boolean;
    video?: boolean;
    imageModel?: string;
    videoModel?: string;
  }) => Promise<void>;
  clearMessages: () => void;
  addMessage: (message: { role: 'user' | 'assistant'; content: string; timestamp: string; isStreaming?: boolean; imageUrls?: string[] }) => void;
  approvalRequest: ApprovalRequest | null;
  clearApprovalRequest: () => void;
  currentPhase: StatusPhase | null;
  researchPhases: Array<{
    phase: string;
    message?: string;
    iteration?: number;
    maxIterations?: number;
    status?: "pending" | "active" | "completed";
  }>;
  webSearchStatus: WebSearchStatus;
}

export function useChatMessages(sessionId: string | null): ChatMessagesHook {
  const { messages, isLoading, error, sendMessage, clearMessages, addMessage, approvalRequest, clearApprovalRequest, currentPhase, researchPhases, webSearchStatus } = useStreamingChat(sessionId || '');

  const handleSendMessage = useCallback(async (message: string, options: {
    web_search?: boolean;
    rag?: boolean;
    deep_search?: boolean;
    uploaded_doc?: boolean;
    model?: string;
    composio_tools?: string[];
    image?: boolean;
    video?: boolean;
    imageModel?: string;
    videoModel?: string;
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
    approvalRequest,
    clearApprovalRequest,
    currentPhase,
    researchPhases,
    webSearchStatus,
  };
}
