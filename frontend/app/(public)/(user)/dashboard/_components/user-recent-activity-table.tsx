"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Bot, 
  Calendar, 
  ExternalLink,
  Eye
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface RecentActivityData {
  recentConversations: Array<{
    id: string;
    title: string;
    gptId: string;
    updatedAt: Date;
    gpt: {
      name: string;
      image: string;
    };
    _count: {
      messages: number;
    };
  }>;
  recentGpts: Array<{
    id: string;
    name: string;
    image: string;
    _count: {
      conversations: number;
    };
  }>;
}

interface RecentActivityTableProps {
  data: RecentActivityData;
}

export function UserRecentActivityTable({ data }: RecentActivityTableProps) {
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Recent Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentConversations.length === 0 ? (
            <div className="text-center py-6">
              <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-sm text-muted-foreground">
                Start chatting with your assigned GPTs to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentConversations.map((conversation) => (
                <div key={conversation.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      {conversation.gpt.image && conversation.gpt.image !== "default-avatar.png" ? (
                        <Image
                          src={conversation.gpt.image}
                          alt={conversation.gpt.name}
                          fill
                          className="rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate" title={conversation.title}>
                        {conversation.title}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>with {conversation.gpt.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {conversation._count.messages} messages
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-xs text-muted-foreground text-right">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(conversation.updatedAt)}
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/gpts/${conversation.gptId}/chat?conversation=${conversation.id}`}>
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent GPTs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Your GPTs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentGpts.length === 0 ? (
            <div className="text-center py-6">
              <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No GPTs assigned</p>
              <p className="text-sm text-muted-foreground">
                Contact your admin to get access to GPTs
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentGpts.map((gpt) => (
                <div key={gpt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      {gpt.image && gpt.image !== "default-avatar.png" ? (
                        <Image
                          src={gpt.image}
                          alt={gpt.name}
                          fill
                          className="rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate" title={gpt.name}>
                        {gpt.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {gpt._count.conversations} conversations
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/gpts/${gpt.id}/chat`}>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Chat
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
