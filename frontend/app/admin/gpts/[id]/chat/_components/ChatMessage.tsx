"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { User, ExternalLink, Download } from "lucide-react";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { ResearchTimeline } from "@/components/ResearchTimeline";
import { ResearchPhaseShimmer } from "@/components/ResearchPhaseShimmer";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { ShimmeringText } from "@/components/ui/shimmering-text";

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
  videoUrls?: string[];
  tokenUsage?: TokenUsage;
  researchPhases?: ResearchPhase[];
  currentPhase?: StatusPhase | null;
  webSearchStatus?: WebSearchStatus;
  thinkingState?: string | null;
}

export default function ChatMessage({
  message,
  isUser,
  timestamp,
  isStreaming = false,
  uploadedDocs = [],
  sources = [],
  imageUrls = [],
  videoUrls = [],
  tokenUsage,
  researchPhases = [],
  currentPhase = null,
  webSearchStatus,
  thinkingState: backendThinkingState,
}: ChatMessageProps) {

  // Handle download for images and videos
  const handleDownload = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || url.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle external link - ensure it opens in new tab
  const handleExternalLink = (e: React.MouseEvent<HTMLElement>, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
    <div className="w-full max-w-5xl mx-auto break-words">
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
            <div className="flex items-start gap-3 pl-2">
              <div className="bg-transparent relative size-8 flex-shrink-0 rounded-full p-0.5 ">
                <div className="bg-transparent h-full w-full overflow-hidden rounded-full  flex items-center justify-center">
                  <Image
                    src="/DruidX logo.png"
                    alt="DruidX logo"
                    width={32}
                    height={32}
                    className="h-full w-full object-contain"
                  />
                </div>
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
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDownload(url, `image-${idx + 1}.${url.split('.').pop()?.split('?')[0] || 'png'}`);
                            }}
                            className="p-2 bg-background/80 rounded-md hover:bg-background/90 transition-colors cursor-pointer"
                            title="Download image"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleExternalLink(e, url)}
                            className="p-2 bg-background/80 rounded-md hover:bg-background/90 transition-colors cursor-pointer"
                            title="Open in new tab"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {videoUrls && videoUrls.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    {videoUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <video
                          src={url}
                          controls
                          className="w-full h-auto rounded-lg border border-border"
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDownload(url, `video-${idx + 1}.${url.split('.').pop()?.split('?')[0] || 'mp4'}`);
                            }}
                            className="p-2 bg-background/80 rounded-md backdrop-blur-sm hover:bg-background/90 transition-colors cursor-pointer"
                            title="Download video"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleExternalLink(e, url)}
                            className="p-2 bg-background/80 rounded-md backdrop-blur-sm hover:bg-background/90 transition-colors cursor-pointer"
                            title="Open in new tab"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {message ? (
                  <div className="bg-muted/60 border border-border rounded-lg p-4 break-words">
                    <Response sources={sources}>{message}</Response>
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
                  backendThinkingState ? (
                    <ShimmeringText className="text-muted-foreground text-[15px]">
                      {backendThinkingState}
                    </ShimmeringText>
                  ) : (
                    <span className="animate-pulse text-[15px] text-muted-foreground">⚪</span>
                  )
                ) : null}
              </div>
            </div>
          </MessageContent>
        )}
      </Message>
    </div>
  );
}
