"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

interface ComposioTool {
  name: string;
  slug: string;
  auth_config_id: string;
  logo: string;
  description: string;
  tools: string[];
}

interface ComposioToolCardProps {
  tool: ComposioTool;
  isConnected?: boolean;
  isEnabled?: boolean;
  onConnect?: (toolSlug: string) => Promise<void>;
  onDisconnect?: (toolSlug: string) => Promise<void>;
  onToggle?: (toolSlug: string, enabled: boolean) => void;
  gptId?: string;
  disabled?: boolean;
}

export function ComposioToolCard({
  tool,
  isConnected = false,
  isEnabled = false,
  onConnect,
  onDisconnect,
  onToggle,
  gptId,
  disabled = false,
}: ComposioToolCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleConnect = async () => {
    if (!onConnect) {
      if (!gptId) {
        toast.error("Please select a GPT to connect tools");
      }
      return;
    }

    try {
      setIsConnecting(true);
      await onConnect(tool.slug);
    } catch (error) {
      console.error("Error connecting tool:", error);
      toast.error("Failed to connect tool");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) {
      toast.error("Disconnect handler not available");
      return;
    }

    try {
      setIsDisconnecting(true);
      await onDisconnect(tool.slug);
    } catch (error) {
      console.error("Error disconnecting tool:", error);
      toast.error("Failed to disconnect tool");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSwitchToggle = async (enabled: boolean) => {
    if (enabled && !isConnected) {
      // If switch is toggled on but not connected, trigger connect
      await handleConnect();
    } else if (onToggle) {
      // If already connected, just toggle enabled state
      onToggle(tool.slug, enabled);
    }
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
        isConnected
          ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
          : "hover:border-primary/50"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {imageError ? (
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-medium">
                  {tool.name.charAt(0)}
                </div>
              ) : (
                <Image
                  src={tool.logo}
                  alt={tool.name}
                  fill
                  className="object-cover"
                  unoptimized
                  onError={() => setImageError(true)}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">
                {tool.name}
              </CardTitle>
              <CardDescription className="text-xs mt-1 line-clamp-2">
                {tool.description}
              </CardDescription>
            </div>
          </div>
          
          {/* Switch and Disconnect Button - positioned like ChatInput */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isConnected ? (
              <>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleSwitchToggle}
                  disabled={disabled || isDisconnecting}
                  className="data-[state=checked]:bg-green-500"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting || disabled}
                  className="h-6 w-6 text-muted-foreground hover:text-red-600"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              </>
            ) : (
              <Switch
                checked={false}
                onCheckedChange={handleSwitchToggle}
                disabled={isConnecting || disabled}
                className={!gptId ? "opacity-50" : ""}
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isConnected && (
          <Badge
            variant="secondary"
            className="mb-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        )}
        {tool.tools && tool.tools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tool.tools.slice(0, 3).map((toolName, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs"
              >
                {toolName}
              </Badge>
            ))}
            {tool.tools.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tool.tools.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

