"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, User, ExternalLink, Download } from "lucide-react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Orb } from "@/components/ui/orb";
import { Loader } from "@/components/ai-elements/loader";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ResearchTimeline } from "@/components/ResearchTimeline";
import { ResearchPhaseShimmer } from "@/components/ResearchPhaseShimmer";
import { Reasoning } from "@/components/ai-elements/reasoning";

interface UploadedDoc {
  url: string;
  filename: string;
  type: string;
}

interface Source {
  href: string;
  title: string;
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface ResearchPhase {
  phase: string;
  message?: string;
  iteration?: number;
  maxIterations?: number;
  status?: "pending" | "active" | "completed";
}

interface StatusPhase {
  phase: string;
  message: string;
  iteration?: number;
  max_iterations?: number;
  [key: string]: any;
}

interface WebSearchStatus {
  isActive: boolean;
  message: string;
  progress?: number;
}

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: string;
  isStreaming?: boolean;
  uploadedDocs?: UploadedDoc[];
  sources?: Source[];
  imageUrls?: string[];
  tokenUsage?: TokenUsage;
  researchPhases?: ResearchPhase[];
  currentPhase?: StatusPhase | null;
  webSearchStatus?: WebSearchStatus;
}

export function scrollToEnd(containerRef: React.RefObject<HTMLElement>) {
  if (containerRef.current) {
    const lastMessage = containerRef.current.lastElementChild;
    if (lastMessage) {
      const scrollOptions: ScrollIntoViewOptions = {
        behavior: "smooth",
        block: "end",
      };
      lastMessage.scrollIntoView(scrollOptions);
    }
  }
}

export default function ChatMessage({
  message,
  isUser,
  timestamp,
  isStreaming = false,
  uploadedDocs = [],
  sources = [],
  imageUrls = [],
  tokenUsage,
  researchPhases = [],
  currentPhase = null,
  webSearchStatus,
}: ChatMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when streaming
  useEffect(() => {
    if (isStreaming && messageRef.current && messageRef.current.parentElement) {
      scrollToEnd({ current: messageRef.current.parentElement });
    }
  }, [message, isStreaming]);

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type === "application/pdf") return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type === "text/markdown") return "📋";
    if (type === "application/json") return "📊";
    return "📄";
  };

  const getFileTypeLabel = (type: string) => {
    if (type.startsWith("image/")) return "Image";
    if (type === "application/pdf") return "PDF";
    if (type.includes("word") || type.includes("document")) return "Word";
    if (type === "text/markdown") return "Markdown";
    if (type === "application/json") return "JSON";
    return "File";
  };

  return (
    <div ref={messageRef} className="w-full max-w-5xl mx-auto px-4 break-words">
      <Message from={isUser ? "user" : "assistant"}>
        {isUser ? (
          <>
            <MessageContent variant="flat">
              <div className="space-y-2">
                {uploadedDocs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedDocs.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-2 py-1 text-xs"
                      >
                        <span className="text-sm">{getFileIcon(doc.type)}</span>
                        <div className="flex flex-col min-w-0">
                          <span
                            className="font-medium truncate max-w-[100px]"
                            title={doc.filename}
                          >
                            {doc.filename}
                          </span>
                          <span className="text-xs opacity-70">
                            {getFileTypeLabel(doc.type)}
                          </span>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <Response sources={sources}>{message}</Response>
                {isStreaming && (
                  <div className="inline-flex items-center ml-2 mt-1">
                    <Loader size={14} className="text-muted-foreground" />
                  </div>
                )}
                <div className="text-xs mt-1 opacity-70 text-muted-foreground">
                  {timestamp}
                </div>
              </div>
            </MessageContent>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback>
                <User className="size-4 text-primary" />
              </AvatarFallback>
            </Avatar>
          </>
        ) : (
          <MessageContent variant="flat">
            <div className="flex items-start gap-3">
              <div className={cn(
                "ring-border size-8 flex-shrink-0 overflow-hidden rounded-full ring-1",
                "flex items-center justify-center"
              )}>
                <Orb className="h-full w-full" />
              </div>
              <div className="flex-1 space-y-2">
                {/* WebSearch Reasoning - show for assistant messages when websearch is active */}
                {!isUser && webSearchStatus?.isActive && (
                  <Reasoning 
                    isStreaming={webSearchStatus.isActive}
                    triggerMessage={webSearchStatus.message}
                  />
                )}
                {/* Deep Research Timeline - show for assistant messages when phases exist */}
                {!isUser && researchPhases.length > 0 && (
                  <ResearchTimeline
                    phases={researchPhases}
                    currentPhase={currentPhase?.phase}
                  />
                )}
                {/* Deep Research Shimmer - show for assistant messages when no timeline but phase active */}
                {!isUser &&
                  currentPhase &&
                  currentPhase.phase !== "waiting_approval" &&
                  researchPhases.length === 0 && (
                    <ResearchPhaseShimmer
                      phase={currentPhase.phase}
                      message={currentPhase.message}
                      iteration={currentPhase.iteration}
                      maxIterations={currentPhase.max_iterations}
                    />
                  )}
                {imageUrls && imageUrls.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {imageUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Generated image ${idx + 1}`}
                          className="w-full h-auto rounded-lg border border-border"
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={url} download className="p-2 bg-background/80 rounded-md">
                            <Download className="h-4 w-4" />
                          </a>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 bg-background/80 rounded-md">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {message ? (
                  <div className="bg-muted/60 border border-border rounded-lg p-4 break-words">
                    <Response sources={sources}>{message}</Response>
                    {isStreaming && !webSearchStatus?.isActive && (
                      <div className="inline-flex items-center ml-2 mt-1">
                        <Loader size={14} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs opacity-70 text-muted-foreground">
                        {timestamp}
                      </div>
                      {tokenUsage && !isStreaming && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="opacity-70">Input:</span>
                            <span className="font-medium">{tokenUsage.input_tokens.toLocaleString()}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="opacity-70">Output:</span>
                            <span className="font-medium">{tokenUsage.output_tokens.toLocaleString()}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="opacity-70">Total:</span>
                            <span className="font-medium text-primary">{tokenUsage.total_tokens.toLocaleString()}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isStreaming && !webSearchStatus?.isActive ? (
                  <div className="flex items-center gap-2">
                    <Loader size={16} className="text-muted-foreground" />
                  </div>
                ) : null}
              </div>
            </div>
          </MessageContent>
        )}
      </Message>
    </div>
  );
}
