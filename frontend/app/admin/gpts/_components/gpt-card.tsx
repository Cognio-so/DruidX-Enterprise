"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminGpt } from "@/data/get-admin-gpts";
import {
  Bot,
  Calendar,
  FileSearch,
  Globe,
  Image as ImageIcon,
  Video,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { deleteGptbyId } from "../action";
import { getModelIcon } from "@/components/brand-icons";

const modelDisplayNames: Record<string, string> = {
  gpt_4o: "GPT-4o",
  gpt_4: "GPT-4", 
  gpt_5: "GPT-5",
  gemini_2_5_flash: "Gemini 2.5 Flash",
  claude_3_5_sonnet: "Claude 3.5 Sonnet",
  claude_3_5_haiku: "Claude 3.5 Haiku",
  claude_3_opus: "Claude 3 Opus",
  o1_preview: "o1 Preview",
  o1_mini: "o1 Mini",
  o2_preview: "o2 Preview",
  o4_mini: "o4 Mini",
  // Groq models
  groq_llama: "Llama (Groq)",
  groq_mixtral: "Mixtral (Groq)",
  // Meta models
  llama_3: "Llama 3",
  llama_3_1: "Llama 3.1",
  meta_llama: "Meta Llama",
  // DeepSeek models
  deepseek_chat: "DeepSeek Chat",
  deepseek_coder: "DeepSeek Coder",
  deepseek_v2: "DeepSeek V2",
  deepseek_v3_1: "DeepSeek V3.1",
  // xAI (Grok) models
  grok_4_fast: "Grok 4 Fast",
  // Moonshot AI (Kimi) models
  kimi_k2_0905: "Kimi K2 0905",
  // Meta models
  meta_llama_3_3_70b: "Meta Llama 3.3 70B",
};

interface GptCardProps {
  gpt: AdminGpt;
}

export function GptCard({ gpt }: GptCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteGptbyId(gpt.id);
        if (result.success) {
          toast.success("GPT deleted successfully");
          router.refresh();
        } else {
          toast.error(result.message || "Failed to delete GPT");
        }
      } catch (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete GPT");
      }
    });
  };

  return (
    <Card className="relative h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex-shrink-0">
              {gpt.image && gpt.image !== "default-avatar.png" ? (
                <Image
                  src={gpt.image}
                  alt={gpt.name}
                  fill
                  className="rounded-full object-cover border border-gray-200 sm:border-2"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                </div>
              )}
            </div>

            {/* Name - Keep in same position but allow wrapping */}
            <div className="min-w-0 flex-1">
              <CardTitle 
                className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold leading-tight break-words"
                title={gpt.name}
                style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  lineHeight: '1.2',
                  maxHeight: '2.4em', // Allow max 2 lines
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {gpt.name}
              </CardTitle>
            </div>
          </div>

          {/* Three-dot dropdown - Always visible */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 p-0 text-primary hover:text-primary/80"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 sm:w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/gpts/${gpt.id }/edit`}>
                    <Pencil className="w-4 h-4 mr-2 text-green-600" />
                    <span className="text-sm">Edit GPT</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash className="w-4 h-4 mr-2 text-destructive" />
                  )}
                  <span className="text-sm">Delete GPT</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        {/* Description with fixed height */}
        <div className="h-[3.5rem] sm:h-[4rem] md:h-[4.5rem] mb-3 sm:mb-4 flex-shrink-0 overflow-hidden">
          <CardDescription className="text-xs sm:text-sm md:text-base line-clamp-2 sm:line-clamp-3">
          {gpt.description}
        </CardDescription>
        </div>

        {/* Fixed position section for Calendar, Model, and Tools */}
        <div className="flex-shrink-0 space-y-2 sm:space-y-2.5">
          {/* First row: Calendar and Model name */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
            <span className="truncate text-xs sm:text-sm">
              {new Date(gpt.createdAt).toLocaleDateString("en-GB")}
            </span>
          </div>
          
            <span className="bg-violet-800 text-white font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px] md:max-w-none px-2 py-1 rounded-full flex items-center gap-1.5">
              {getModelIcon(gpt.model)}
              <span className="truncate">
                {modelDisplayNames[gpt.model] || gpt.model}
              </span>
            </span>
          </div>

          {/* Second row: Tool icons with names */}
          {(gpt.webBrowser || gpt.hybridRag || gpt.imageEnabled || gpt.videoEnabled) && (
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-500 flex-wrap">
            {gpt.webBrowser && (
                <div className="flex items-center gap-1">
                <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Web Browser</span>
              </div>
            )}
            {gpt.hybridRag && (
                <div className="flex items-center gap-1">
                <FileSearch className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Hybrid RAG</span>
              </div>
            )}
            {gpt.imageEnabled && (
                <div className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Image</span>
              </div>
            )}
            {gpt.videoEnabled && (
                <div className="flex items-center gap-1">
                <Video className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Video</span>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Start Chat Button */}
        <div className="mt-auto pt-3 sm:pt-4 md:pt-5">
          <Link
            href={`/admin/gpts/${gpt.id}/chat`}
            className={buttonVariants({
              variant: "default",
              className: "w-full text-sm sm:text-base h-8 sm:h-9 md:h-10",
            })}
          >
            <MessageCircle className="mr-2 w-4 h-4" />
            Start Chat
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}