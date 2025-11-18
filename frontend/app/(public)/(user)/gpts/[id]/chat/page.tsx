"use client";

import ChatHeader from "./_components/UserChatHeader";
import ChatInput from "./_components/UserChatInput";
import ChatMessage from "./_components/UserChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatSession } from "@/hooks/use-chat-session";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useAutoSaveConversation } from "@/hooks/use-auto-save-conversation";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getModelByFrontendValue } from "@/lib/modelMapping";
import { ResearchPlanApprovalDialog } from "@/components/ResearchPlanApprovalDialog";
import type { VoiceAgentConfig } from "@/components/voice/voice-config-dialog";

interface GptData {
  id: string;
  name: string;
  image: string;
  description: string;
  model: string;
  imageEnabled?: boolean;
  videoEnabled?: boolean;
  imageModel?: string;
  videoModel?: string;
  voiceAgentEnabled?: boolean;
  voiceAgentName?: string | null;
  voiceConfidenceThreshold?: number | null;
  voiceSttProvider?: string | null;
  voiceSttModelId?: string | null;
  voiceSttModelName?: string | null;
  voiceTtsProvider?: string | null;
  voiceTtsModelId?: string | null;
  voiceTtsModelName?: string | null;
}

export default function ChatGptById() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gptId = params.id as string;
  const conversationId = searchParams.get("conversation");
  const {
    sessionId,
    uploadDocument,
    hybridRag,
    updateGPTConfig,
    updateVoiceSettings,
  } = useChatSession();
  const {
    messages,
    isLoading,
    sendMessage,
    addMessage,
    approvalRequest,
    clearApprovalRequest,
    currentPhase,
    researchPhases,
    webSearchStatus,
    thinkingState,
    clearMessages,
  } = useChatMessages(sessionId);
  const [gptData, setGptData] = useState<GptData | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  const hasMessages = messages.length > 0;
  const [voiceConnected, setVoiceConnected] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Handle voice messages and add them to the chat
  const handleVoiceMessage = useCallback(
    (voiceMessage: {
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }) => {
      // Add voice messages to the chat messages array
      if (voiceMessage.content && voiceMessage.content.trim()) {
        addMessage({
          role: voiceMessage.role,
          content: voiceMessage.content,
          timestamp: voiceMessage.timestamp,
          isStreaming: false,
        });
      }
    },
    [addMessage]
  );
  
  // Set up scroll management
  const { shouldAutoScroll, scrollToBottom, scrollContainerRef } = useChatScroll({
    enabled: hasMessages,
  });

  // Find and set the ScrollArea viewport element
  useEffect(() => {
    if (scrollAreaRef.current && hasMessages) {
      const viewport = scrollAreaRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;
      if (viewport) {
        (scrollContainerRef as React.MutableRefObject<HTMLElement>).current = viewport;
      }
    }
  }, [hasMessages, messages.length, scrollContainerRef]);

  // Auto-scroll when messages update and user is at bottom
  useEffect(() => {
    if (hasMessages && shouldAutoScroll) {
      const isStreaming = messages.some((msg) => msg.isStreaming);
      // Scroll when streaming, loading, or when a new message is added
      if (isStreaming || isLoading || messages.length > 0) {
        // Small delay to ensure DOM is updated
        const timeoutId = setTimeout(() => {
          scrollToBottom();
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, isLoading, hasMessages, shouldAutoScroll, scrollToBottom]);

  useAutoSaveConversation({
    gptId,
    gptName: gptData?.name || "Unknown GPT",
    sessionId,
    messages,
  });

  const handleApproval = async () => {
    if (!sessionId) return;
    try {
      const response = await fetch("/api/deepresearch/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, approved: true, feedback: "" }),
      });
      if (response.ok) {
        clearApprovalRequest();
      }
    } catch (error) {
      console.error("Failed to submit approval:", error);
    }
  };

  const handleCancel = async (feedback?: string) => {
    if (!sessionId) return;
    try {
      const response = await fetch("/api/deepresearch/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          approved: false,
          feedback: feedback || "",
        }),
      });
      if (response.ok) {
        clearApprovalRequest();
      }
    } catch (error) {
      console.error("Failed to submit cancellation:", error);
    }
  };

  const handleNewChat = useCallback(() => {
    // Clear messages first
    clearMessages();
    // Refresh the page to create a new session
    router.refresh();
  }, [clearMessages, router]);

  // Load conversation history if conversationId is provided
  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId || messages.length > 0) return;

      setIsLoadingConversation(true);
      try {
        const { getConversation } = await import("@/app/admin/history/action");
        const result = await getConversation(conversationId, false);
        
        if (result.success && result.conversation?.messages && result.conversation.messages.length > 0) {
          // Clear any existing messages first
          clearMessages();
          
          // Load all messages from the conversation
          result.conversation.messages.forEach((msg: any) => {
            addMessage({
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp).toISOString(),
              isStreaming: false,
              uploadedDocs: msg.uploadedDocs ? (Array.isArray(msg.uploadedDocs) ? msg.uploadedDocs : []) : undefined,
              imageUrls: msg.imageUrls ? (Array.isArray(msg.imageUrls) ? msg.imageUrls : []) : undefined,
              videoUrls: msg.videoUrls ? (Array.isArray(msg.videoUrls) ? msg.videoUrls : []) : undefined,
            });
          });
        }
      } catch (error) {
        console.error("Failed to load conversation:", error);
      } finally {
        setIsLoadingConversation(false);
      }
    };

    loadConversation();
  }, [conversationId, addMessage, clearMessages, messages.length]);

  useEffect(() => {
    const fetchGptData = async () => {
      try {
        if (gptId) {
          const response = await fetch(`/api/gpts/${gptId}`);
          if (response.ok) {
            const gpt = await response.json();

            const modelInfo = getModelByFrontendValue(gpt.model);
            setGptData({
              id: gpt.id,
              name: gpt.name,
              image: gpt.image,
              description: gpt.description,
              model: gpt.model,
              imageEnabled: gpt.imageEnabled,
              videoEnabled: gpt.videoEnabled,
              imageModel: gpt.imageModel,
              videoModel: gpt.videoModel,
              voiceAgentEnabled: gpt.voiceAgentEnabled,
              voiceAgentName: gpt.voiceAgentName,
              voiceConfidenceThreshold: gpt.voiceConfidenceThreshold,
              voiceSttProvider: gpt.voiceSttProvider,
              voiceSttModelId: gpt.voiceSttModelId,
              voiceSttModelName: gpt.voiceSttModelName,
              voiceTtsProvider: gpt.voiceTtsProvider,
              voiceTtsModelId: gpt.voiceTtsModelId,
              voiceTtsModelName: gpt.voiceTtsModelName,
            });
          } else {
            console.error("Failed to fetch GPT data:", response.status);
          }
        }
      } catch (error) {
        console.error("Failed to fetch GPT data:", error);
      }
    };

    fetchGptData();
  }, [gptId]);

  const handleRetryMessage = useCallback(
    (content: string) => {
      if (!content.trim()) {
        return;
      }
      sendMessage(content.trim(), {
        web_search: false,
        rag: hybridRag,
        deep_search: false,
        uploaded_doc: false,
      });
    },
    [sendMessage, hybridRag]
  );

  const voiceDefaults: VoiceAgentConfig | undefined = gptData
    ? {
        voiceAgentEnabled: Boolean(gptData.voiceAgentEnabled),
        voiceAgentName: gptData.voiceAgentName || "",
        voiceConfidenceThreshold: gptData.voiceConfidenceThreshold ?? 0.4,
        voiceSttProvider: (gptData.voiceSttProvider ??
          null) as VoiceAgentConfig["voiceSttProvider"],
        voiceSttModelId: gptData.voiceSttModelId ?? null,
        voiceSttModelName: gptData.voiceSttModelName ?? null,
        voiceTtsProvider: (gptData.voiceTtsProvider ??
          null) as VoiceAgentConfig["voiceTtsProvider"],
        voiceTtsModelId: gptData.voiceTtsModelId ?? null,
        voiceTtsModelName: gptData.voiceTtsModelName ?? null,
      }
    : undefined;

  return (
    <>
      <ResearchPlanApprovalDialog
        open={!!approvalRequest}
        onOpenChange={(open) => {
          // Only clear if user explicitly closes the dialog (not when setting to open)
          // This prevents the dialog from auto-closing when approvalRequest is set
          if (!open && approvalRequest) {
            // User closed the dialog - only clear if they didn't approve/cancel
            // The handleApproval/handleCancel will clear it after API call
            // So we don't clear here to prevent race conditions
          }
        }}
        plan={approvalRequest?.plan || []}
        onApprove={handleApproval}
        onCancel={handleCancel}
      />
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-2 bg-background">
          <ChatHeader 
            gptName={gptData?.name} 
            gptImage={gptData?.image} 
            onNewChat={handleNewChat}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {hasMessages && (
            <div ref={scrollAreaRef} className="h-full">
              <ScrollArea className="h-full px-2 pt-2 pb-0">
                <div className="space-y-2">
                  {messages.map((msg, index) => {
                    // Hide ChatMessage loader when deep research is active (to avoid duplicate loaders)
                    const isDeepResearchActive =
                      researchPhases.length > 0 ||
                      (currentPhase && currentPhase.phase !== "waiting_approval");
                    // Only show webSearchStatus on the last assistant message (currently streaming or if websearch is active)
                    const isLastAssistantMessage = 
                      !msg.isUser && 
                      index === messages.length - 1 && 
                      (msg.isStreaming || isLoading || webSearchStatus?.isActive);
                    return (
                      <ChatMessage
                        key={msg.id}
                        message={msg.content}
                        isUser={msg.role === "user"}
                        timestamp={new Date(msg.timestamp).toLocaleTimeString()}
                        isStreaming={
                          isDeepResearchActive ? false : msg.isStreaming
                        }
                        uploadedDocs={msg.uploadedDocs}
                        imageUrls={msg.imageUrls}
                        videoUrls={msg.videoUrls}
                        tokenUsage={msg.tokenUsage}
                        researchPhases={researchPhases}
                        currentPhase={currentPhase}
                        webSearchStatus={isLastAssistantMessage ? webSearchStatus : undefined}
                        thinkingState={isLastAssistantMessage ? thinkingState : undefined}
                        onRetry={msg.role === "user" ? handleRetryMessage : undefined}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
          {!hasMessages && !voiceConnected && (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-semibold text-primary">
                  What can I help with?
                </h1>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-2 pt-0 pb-2 bg-background">
          <ChatInput
            onSendMessage={sendMessage}
            onDocumentUploaded={uploadDocument}
            hasMessages={hasMessages}
            isLoading={isLoading}
            hybridRag={hybridRag}
            defaultModel={gptData?.model}
            gptId={gptId}
            sessionId={sessionId}
            onVoiceMessage={handleVoiceMessage}
            onVoiceConnectionChange={setVoiceConnected}
            imageEnabled={gptData?.imageEnabled}
            videoEnabled={gptData?.videoEnabled}
            imageModel={gptData?.imageModel}
            videoModel={gptData?.videoModel}
            onModelChange={updateGPTConfig}
            defaultVoiceConfig={voiceDefaults}
            onVoiceSettingsChange={updateVoiceSettings}
          />
        </div>
      </div>
    </>
  );
}
