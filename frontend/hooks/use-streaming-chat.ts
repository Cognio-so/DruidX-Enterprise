import { useState, useCallback, useRef } from 'react';

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  imageUrls?: string[];
  tokenUsage?: TokenUsage;
}

interface ChatRequest {
  message: string;
  web_search?: boolean;
  rag?: boolean;
  deep_search?: boolean;
  uploaded_doc?: boolean;
  model?: string;
  composio_tools?: string[];
}

interface ApprovalRequest {
  plan: string[];
  total_questions: number;
}

interface StatusPhase {
  phase: string;
  message: string;
  [key: string]: any;
}

interface StreamingChatHook {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (request: ChatRequest) => Promise<void>;
  clearMessages: () => void;
  addMessage: (message: Omit<Message, 'id'>) => void;
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
}

export function useStreamingChat(sessionId: string): StreamingChatHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [currentPhase, setCurrentPhase] = useState<StatusPhase | null>(null);
  const [researchPhases, setResearchPhases] = useState<Array<{
    phase: string;
    message?: string;
    iteration?: number;
    maxIterations?: number;
    status?: "pending" | "active" | "completed";
  }>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (request: ChatRequest) => {
    if (!sessionId) {
      setError('Session ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: request.message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const requestBody = {
        sessionId,
        ...request,
      };

      // Route to appropriate endpoint based on deep_search flag
      const endpoint = request.deep_search ? '/api/deepresearch/stream' : '/api/chat/stream';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('📨 Received SSE data:', data.type, data);
              
              if (data.type === 'approval_required' && data.data) {
                // Handle approval request event
                console.log('🔔 Approval required event received:', data.data);
                const { plan, total_questions } = data.data;
                console.log('🔔 Plan data:', plan, 'Total questions:', total_questions);
                setApprovalRequest({
                  plan: plan || [],
                  total_questions: total_questions || 0,
                });
                // Clear current phase when approval is required
                setCurrentPhase(null);
              } else if (data.type === 'status' && data.data) {
                // Handle status events for different phases
                const phaseData = data.data;
                
                // If status is explicitly "completed", mark as completed and clear current phase
                if (phaseData.status === "completed") {
                  setResearchPhases((prev) => {
                    const existingIndex = prev.findIndex((p) => p.phase === phaseData.phase);
                    if (existingIndex >= 0) {
                      const updated = [...prev];
                      updated[existingIndex] = { ...updated[existingIndex], status: "completed" as const };
                      return updated;
                    }
                    return prev;
                  });
                  // Clear current phase if this was the active one
                  if (currentPhase?.phase === phaseData.phase) {
                    setCurrentPhase(null);
                  }
                } else {
                  // Active phase - set as current and update timeline
                  setCurrentPhase(phaseData);
                  
                  // Update research phases timeline
                  setResearchPhases((prev) => {
                    const existingIndex = prev.findIndex((p) => p.phase === phaseData.phase);
                    const newPhase = {
                      phase: phaseData.phase,
                      message: phaseData.message,
                      iteration: phaseData.iteration,
                      maxIterations: phaseData.max_iterations,
                      status: "active" as const,
                    };
                    
                    if (existingIndex >= 0) {
                      // Update existing phase (e.g., execution with different iteration)
                      const updated = [...prev];
                      // If it's execution phase with iteration, update the message but keep it active
                      if (phaseData.phase === "execution" && phaseData.iteration) {
                        updated[existingIndex] = { ...updated[existingIndex], ...newPhase };
                      } else {
                        // For other phases, mark previous as completed and update
                        updated[existingIndex] = { ...updated[existingIndex], ...newPhase };
                      }
                      return updated;
                    } else {
                      // Mark previous phases as completed and add new one
                      const updated = prev.map((p) => ({ ...p, status: "completed" as const }));
                      return [...updated, newPhase];
                    }
                  });
                }
                
                // Don't add status messages to content - they're for UI state only
              } else if (data.type === 'content' && data.data) {
                const { content, full_response, is_complete, img_urls, token_usage } = data.data;
                
                // Debug logging to see what we're receiving
                console.log('Streaming data received:', { content, full_response, is_complete, img_urls, token_usage });
                
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? {
                        ...msg,
                        content: full_response || content || '',
                        imageUrls: img_urls || msg.imageUrls, // Preserve existing if not in update
                        tokenUsage: token_usage || msg.tokenUsage, // Preserve existing if not in update
                        isStreaming: !is_complete,
                      }
                    : msg
                ));
              } else if (data.type === 'error') {
                setError(data.data.error || 'An error occurred');
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? {
                        ...msg,
                        content: 'Sorry, an error occurred while processing your request.',
                        isStreaming: false,
                      }
                    : msg
                ));
              } else if (data.type === 'done') {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? {
                        ...msg,
                        isStreaming: false,
                      }
                    : msg
                ));
              }
            } catch (parseError) {
              // Handle parse error silently
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? {
                ...msg,
                content: 'Sorry, an error occurred while processing your request.',
                isStreaming: false,
              }
            : msg
        ));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [sessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const clearApprovalRequest = useCallback(() => {
    setApprovalRequest(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    addMessage,
    approvalRequest,
    clearApprovalRequest,
    currentPhase,
    researchPhases,
  };
}
