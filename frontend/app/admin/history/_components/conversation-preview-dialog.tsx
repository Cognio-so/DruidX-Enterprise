"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminHistory } from "@/data/get-admin-history";
import {
  Bot,
  User,
  Calendar,
  MessageCircle,
  Eye,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import Markdown from "@/components/ui/markdown";

interface ConversationPreviewDialogProps {
  history: AdminHistory;
  children: React.ReactNode;
}

export function ConversationPreviewDialog({ history, children }: ConversationPreviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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

  const parseJsonField = (field: any) => {
    if (!field) return null;
    // Prisma Json type returns the parsed object directly
    return Array.isArray(field) ? field : null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className="w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw] max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] max-h-[95%] flex flex-col p-0"
        style={{ 
          width: '95vw',
          maxWidth: '95vw'
        }}
      >
        <DialogHeader className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b">
          <DialogTitle className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8">
              {history.gpt.image && history.gpt.image !== "default-avatar.png" ? (
                <Image
                  src={history.gpt.image}
                  alt={history.gpt.name}
                  fill
                  className="rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm sm:text-base md:text-lg font-semibold truncate" title={history.title}>
                {history.title}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground font-normal truncate">
                with {history.gpt.name}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-4 h-4 sm:w-5 sm:h-5">
                <AvatarFallback className="text-xs">
                  {getInitials(history.user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs sm:text-sm truncate">{history.user.name}</span>
            </div>
            <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{formatDate(history.updatedAt)}</span>
            </div>
            <Badge variant="secondary" className="text-xs w-fit">
              <MessageCircle className="w-3 h-3 mr-1" />
              {history._count.messages} messages
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-[calc(95vh-180px)] sm:h-[calc(95vh-200px)] md:h-[calc(95vh-220px)]">
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6">
              {history.messages.map((message: any, index: number) => (
                <div key={index} className="flex gap-2 sm:gap-3 md:gap-4">
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <Avatar className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(history.user.name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {message.role === 'user' ? history.user.name : history.gpt.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {/* Show uploaded files for user messages */}
                      {message.role === 'user' && parseJsonField(message.uploadedDocs) && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(parseJsonField(message.uploadedDocs) as Array<{ url: string; filename: string; type: string }>).map((doc, docIdx) => (
                            <div
                              key={docIdx}
                              className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-2 py-1 text-xs"
                            >
                              <span className="text-sm">{getFileIcon(doc.type)}</span>
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate max-w-[100px]" title={doc.filename}>
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
                      
                      {/* Show generated images for assistant messages */}
                      {message.role === 'assistant' && parseJsonField(message.imageUrls) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          {(parseJsonField(message.imageUrls) as string[]).map((url, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={url}
                                alt={`Generated image ${idx + 1}`}
                                className="w-full h-auto rounded-lg border border-border"
                                loading="lazy"
                              />
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 p-2 bg-background/80 rounded-md hover:bg-background/90 transition-colors opacity-0 group-hover:opacity-100"
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Show generated videos for assistant messages */}
                      {message.role === 'assistant' && parseJsonField(message.videoUrls) && (
                        <div className="grid grid-cols-1 gap-2 mb-2">
                          {(parseJsonField(message.videoUrls) as string[]).map((url, idx) => (
                            <div key={idx} className="relative group">
                              <video
                                src={url}
                                controls
                                className="w-full h-auto rounded-lg border border-border"
                                preload="metadata"
                              >
                                Your browser does not support the video tag.
                              </video>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 p-2 bg-background/80 rounded-md hover:bg-background/90 transition-colors opacity-0 group-hover:opacity-100"
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="bg-muted/60 border border-border rounded-lg p-2 sm:p-3 md:p-4">
                        <Markdown 
                          content={message.content}
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
