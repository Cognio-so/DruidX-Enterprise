"use client";

import ChatHeader from "./_components/ChatHeader";
import ChatInput from "./_components/ChatInput";
import ChatMessage from "./_components/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatSession } from "@/hooks/use-chat-session";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useAutoSaveConversation } from "@/hooks/use-auto-save-conversation";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getModelByFrontendValue } from "@/lib/modelMapping";
import { ResearchPlanApprovalDialog } from "@/components/ResearchPlanApprovalDialog";

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
}

export default function ChatGptById() {
  const params = useParams();
  const gptId = params.id as string;
  const { sessionId, uploadDocument, hybridRag } = useChatSession();
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
  } = useChatMessages(sessionId);
  const [gptData, setGptData] = useState<GptData | null>(null);

  // Debug: Log approval request changes
  useEffect(() => {
    console.log("🔔 Approval request changed:", approvalRequest);
  }, [approvalRequest]);

  // Debug: Log webSearchStatus changes
  useEffect(() => {
    console.log("🌐 WebSearch status changed:", webSearchStatus);
  }, [webSearchStatus]);

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

  const hasMessages = messages.length > 0;
  const [voiceConnected, setVoiceConnected] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
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
          <ChatHeader gptName={gptData?.name} gptImage={gptData?.image} />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {hasMessages && (
            <div ref={scrollAreaRef} className="h-full">
              <ScrollArea className="h-full p-2">
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
                        imageUrls={msg.imageUrls}
                        tokenUsage={msg.tokenUsage}
                        researchPhases={researchPhases}
                        currentPhase={currentPhase}
                        webSearchStatus={isLastAssistantMessage ? webSearchStatus : undefined}
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

        <div className="flex-shrink-0 p-2 bg-background">
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
          />
        </div>
      </div>
    </>
  );
}
