"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/themeToggle";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { Bot, MessageSquarePlus, Pencil, PencilLine } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";

interface ChatHeaderProps {
  gptName?: string;
  gptImage?: string;
  onNewChat?: () => void;
  gptId?: string;
}

export default function ChatHeader({ gptName, gptImage, onNewChat, gptId }: ChatHeaderProps) {
  const { data: session } = authClient.useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute fallback text consistently
  const getFallbackText = () => {
    if (!mounted || !session?.user) return "";
    if (session.user.name && session.user.name.length > 0) {
      return session.user.name.charAt(0).toUpperCase();
    }
    if (session.user.email) {
      return session.user.email.charAt(0).toUpperCase();
    }
    return "";
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-8 w-8 md:hidden" />
        <div className="relative w-8 h-8">
          {gptImage && gptImage !== "default-avatar.png" ? (
            <Image
              src={gptImage}
              alt={gptName || "GPT"}
              fill
              className="rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-semibold text-foreground">
            {gptName || "GPT Assistant"}
          </h1>
          <p className="text-xs text-muted-foreground">
            AI Assistant
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {onNewChat && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            className="gap-2"
            title="New Chat"
          >
            <MessageSquarePlus className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        )}
        {gptId && (
          <>
            <Link href={`/admin/gpts/${gptId}/edit`} className="hidden sm:flex">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                title="Edit GPT"
              >
                <PencilLine className="h-4 w-4 text-primary" />
                Edit GPT
              </Button>
            </Link>
            <Link href={`/admin/gpts/${gptId}/edit`} className="sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                title="Edit GPT"
              >
                <Pencil className="h-4 w-4 text-primary" />
              </Button>
            </Link>
          </>
        )}
        <ThemeToggle />
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={
              session?.user?.image ??
              (session?.user?.email ? `https://avatar.vercel.sh/${session.user.email}` : undefined)
            }
            alt={session?.user?.name || "User"}
          />
          <AvatarFallback suppressHydrationWarning>
            {getFallbackText()}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
