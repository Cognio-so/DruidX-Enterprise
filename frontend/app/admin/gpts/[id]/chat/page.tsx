"use client";

import ChatHeader from "./_components/ChatHeader";
import ChatInput from "./_components/ChatInput";
import ChatMessage from "./_components/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatSession } from "@/hooks/use-chat-session";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useAutoSaveConversation } from "@/hooks/use-auto-save-conversation";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getModelByFrontendValue } from "@/lib/modelMapping";

interface GptData {
  id: string;
  name: string;
  image: string;
  description: string;
  model: string;
}

export default function ChatGptById() {
  const params = useParams();
  const gptId = params.id as string;
  const { sessionId, uploadDocument, hybridRag } = useChatSession();
  const { messages, isLoading, sendMessage, addMessage } = useChatMessages(sessionId);
  const [gptData, setGptData] = useState<GptData | null>(null);

  // Handle voice messages and add them to the chat
  const handleVoiceMessage = useCallback((voiceMessage: { id: string; role: "user" | "assistant"; content: string; timestamp: string }) => {
    // Add voice messages to the chat messages array
    if (voiceMessage.content && voiceMessage.content.trim()) {
      addMessage({
        role: voiceMessage.role,
        content: voiceMessage.content,
        timestamp: voiceMessage.timestamp,
        isStreaming: false,
      });
    }
  }, [addMessage]);

  const hasMessages = messages.length > 0;
  const [voiceConnected, setVoiceConnected] = useState(false);

  useAutoSaveConversation({
    gptId,
    gptName: gptData?.name || 'Unknown GPT',
    sessionId,
    messages
  });

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
              model: gpt.model 
            });
          } else {
            console.error('Failed to fetch GPT data:', response.status);
          }
        }
      } catch (error) {
        console.error('Failed to fetch GPT data:', error);
      }
    };

    fetchGptData();
  }, [gptId]);


  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-2 bg-background">
        <ChatHeader 
          gptName={gptData?.name}
          gptImage={gptData?.image}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {hasMessages && (
          <ScrollArea className="h-full p-2">
            <div className="space-y-2">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg.content}
                  isUser={msg.role === 'user'}
                  timestamp={new Date(msg.timestamp).toLocaleTimeString()}
                  isStreaming={msg.isStreaming}
                  imageUrls={msg.imageUrls}
                />
              ))}
            </div>
          </ScrollArea>
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
        />
      </div>
    </div>
  );
}
