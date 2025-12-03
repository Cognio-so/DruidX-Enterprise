"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  saveUserConversation,
  updateUserConversationById,
  type ConversationData,
} from "@/app/(public)/(user)/history/action";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  uploadedDocs?: Array<{ url: string; filename: string; type: string }>;
  imageUrls?: string[];
  videoUrls?: string[];
}

interface UseAutoSaveConversationProps {
  gptId: string;
  gptName: string;
  sessionId: string | null;
  messages: Message[];
  /**
   * When resuming an existing conversation from history, this will be set.
   * We should then update that conversation instead of creating a new one,
   * otherwise multiple copies of the same conversation are created.
   */
  conversationId?: string | null;
}

export function useAutoSaveConversation({
  gptId,
  gptName,
  sessionId,
  messages,
  conversationId,
}: UseAutoSaveConversationProps) {
  const lastSavedCountRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generateTitle = useCallback((gptNameParam: string, allMessages: Message[]) => {
    // Try to get the first user message to create a meaningful title
    const firstUserMessage = allMessages.find((msg) => msg.role === "user");

    if (firstUserMessage && firstUserMessage.content.trim()) {
      // Extract a title from the first user message (max 50 chars)
      let title = firstUserMessage.content.trim();

      // Remove markdown formatting if present
      title = title.replace(/^#+\s*/, ""); // Remove markdown headers
      title = title.replace(/\*\*/g, ""); // Remove bold
      title = title.replace(/\*/g, ""); // Remove italic
      title = title.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1"); // Remove markdown links

      // Truncate to 50 characters and add ellipsis if needed
      if (title.length > 50) {
        title = title.substring(0, 47) + "...";
      }

      // Add timestamp for uniqueness
      const now = new Date();
      const month = now.toLocaleDateString("en-US", { month: "short" });
      const day = now.getDate();
      const time = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return `${title} - ${month} ${day}, ${time}`;
    }

    // Fallback to GPT name with timestamp if no user message found
    const now = new Date();
    const month = now.toLocaleDateString("en-US", { month: "short" });
    const day = now.getDate();
    const time = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${gptNameParam} - ${month} ${day}, ${time}`;
  }, []);

  const buildConversationPayload = useCallback((): ConversationData | null => {
    if (!sessionId || messages.length === 0) return null;

    // Only save if we have both user and assistant messages
    const hasUserMessages = messages.some((msg) => msg.role === "user");
    const hasAssistantMessages = messages.some((msg) => msg.role === "assistant");

    if (!hasUserMessages || !hasAssistantMessages) return null;

    // Check if there are any streaming messages
    const hasStreamingMessages = messages.some((msg) => msg.isStreaming);
    if (hasStreamingMessages) return null;

    return {
      title: generateTitle(gptName, messages),
      gptId,
      sessionId,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        uploadedDocs: msg.uploadedDocs,
        imageUrls: msg.imageUrls,
        videoUrls: msg.videoUrls,
      })),
    };
  }, [sessionId, messages, gptId, gptName, generateTitle]);

  const saveConversationData = useCallback(async () => {
    const payload = buildConversationPayload();
    if (!payload) return;

    try {
      if (conversationId) {
        // When resuming from history, keep using the same conversation row
        await updateUserConversationById(conversationId, payload);
      } else {
        // Brand new conversation – create or upsert by sessionId
        await saveUserConversation(payload);
      }
      lastSavedCountRef.current = messages.length;
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [buildConversationPayload, conversationId, messages.length]);

  useEffect(() => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only proceed if we have a session and messages
    if (!sessionId || messages.length === 0) return;

    // Check if we have new messages since last save
    if (messages.length <= lastSavedCountRef.current) return;

    // Check if the last message is from assistant and not streaming
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "assistant" && !lastMessage.isStreaming) {
      // Debounce the save operation by 1 second
      saveTimeoutRef.current = setTimeout(() => {
        void saveConversationData();
      }, 1000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, sessionId, saveConversationData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
}
