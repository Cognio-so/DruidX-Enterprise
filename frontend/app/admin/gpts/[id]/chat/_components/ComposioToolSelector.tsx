"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Settings, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

interface ComposioTool {
  name: string;
  slug: string;
  auth_config_id: string;
  logo: string;
  description: string;
  tools: string[];
}

interface ComposioToolSelectorProps {
  gptId: string;
  onToolsChange: (tools: string[]) => void;
  disabled?: boolean;
}

export function ComposioToolSelector({
  gptId,
  onToolsChange,
  disabled = false,
}: ComposioToolSelectorProps) {

  const [availableTools, setAvailableTools] = useState<ComposioTool[]>([]);
  const [activeConnections, setActiveConnections] = useState<string[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [connectionIds, setConnectionIds] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    const fetchAvailableTools = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/mcp/available-tools");
        if (response.ok) {
          const data = await response.json();
          setAvailableTools(data.tools || []);
        } else {
          toast.error("Failed to fetch available tools");
        }
      } catch (error) {
        console.error("Error fetching tools:", error);
        toast.error("Failed to fetch available tools");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableTools();
  }, []);

  const fetchConnections = async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
      }
      const response = await fetch(`/api/mcp/connections/${gptId}`);

      if (response.ok) {
        const data = await response.json();

        const connectedApps =
          data.connections?.map((conn: any) => conn.app_name?.toLowerCase()) ||
          [];

        const connectionIdMap: Record<string, string> = {};
        data.connections?.forEach((conn: any) => {
          if (conn.app_name) {
            connectionIdMap[conn.app_name.toLowerCase()] = conn.id;
          }
        });
        setConnectionIds(connectionIdMap);

        setActiveConnections(connectedApps);
        if (showToast) {
          toast.success("Connections refreshed");
        }
      } else {
        console.error("fetchConnections failed with status:", response.status);
        const errorData = await response.json();
        console.error("fetchConnections error:", errorData);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
      if (showToast) {
        toast.error("Failed to refresh connections");
      }
    } finally {
      if (showToast) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (gptId) {
      fetchConnections();
    } else {
      console.log("No gptId provided, skipping fetchConnections");
    }
  }, [gptId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "mcp_oauth_success") {
        toast.success("Tool connected successfully!");
        fetchConnections();
        setOpen(false); 
      } else if (event.data?.type === "mcp_oauth_error") {
        toast.error("Failed to connect tool");
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("mcp_success") === "true") {
      const connectionId = urlParams.get("connection_id");
      toast.success(
        `Tool connected successfully! ${
          connectionId ? `(ID: ${connectionId})` : ""
        }`
      );
      fetchConnections();
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    } else if (urlParams.get("mcp_error") === "true") {
      const error = urlParams.get("error") || "Failed to connect tool";
      toast.error(error);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleToolToggle = (toolSlug: string, enabled: boolean) => {
    if (enabled) {
      setEnabledTools((prev) => [...prev, toolSlug]);
    } else {
      setEnabledTools((prev) => prev.filter((t) => t !== toolSlug));
    }
  };

  const handleConnect = async (toolSlug: string) => {
    try {
      setConnecting(toolSlug);
      const response = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gpt_id: gptId,
          app_name: toolSlug,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        window.location.href = data.redirect_url;

        toast.success(`Redirecting to ${toolSlug} authentication...`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to initiate connection");
      }
    } catch (error) {
      console.error("Error connecting tool:", error);
      toast.error("Failed to connect tool");
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (toolSlug: string) => {
    try {
      const connectionId = connectionIds[toolSlug.toLowerCase()];

      

      if (!connectionId) {
        console.error("Connection ID not found for tool:", toolSlug);
        toast.error("Connection ID not found");
        return;
      }

      setDisconnecting(toolSlug);
      const response = await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gpt_id: gptId,
          connection_id: connectionId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Tool disconnected successfully");
        setEnabledTools((prev) => prev.filter((t) => t !== toolSlug));
        setTimeout(() => {
          fetchConnections();
        }, 2000);
      } else {
        console.error("Disconnect failed:", result);
        toast.error(result.error || "Failed to disconnect tool");
      }
    } catch (error) {
      console.error("Error disconnecting tool:", error);
      toast.error("Failed to disconnect tool");
    } finally {
      setDisconnecting(null);
    }
  };

  useEffect(() => {
    onToolsChange(enabledTools);
  }, [enabledTools, onToolsChange]);

  const isConnected = (toolSlug: string) => {
    return activeConnections.includes(toolSlug.toLowerCase());
  };

  const isEnabled = (toolSlug: string) => {
    return enabledTools.includes(toolSlug);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={disabled}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[500px] max-h-[350px] p-3"
        align="center"
        side="bottom"
        sideOffset={10}
        avoidCollisions={true}
        collisionPadding={20}
        alignOffset={0}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Composio Tools</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-xs">Loading tools...</span>
            </div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style]:none [scrollbar-width]:none">
              {/* Grid Layout - 2 columns */}
              <div className="grid grid-cols-2 gap-2">
                {availableTools.map((tool) => (
                  <div
                    key={tool.slug}
                    className={`relative flex items-center justify-between p-2 border rounded-md transition-all duration-200 hover:shadow-sm ${
                      isConnected(tool.slug)
                        ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                        : "bg-card hover:bg-accent"
                    }`}
                  >
                    {/* Icon and Tool Name */}
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <img
                        src={tool.logo}
                        alt={tool.name}
                        className="w-5 h-5 rounded flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/globe.svg";
                        }}
                      />
                      <h4
                        className={`font-medium text-xs truncate ${
                          isConnected(tool.slug)
                            ? "text-green-700 dark:text-green-300"
                            : "text-foreground"
                        }`}
                      >
                        {tool.name}
                      </h4>
                    </div>

                    {/* Toggle Switch and Disconnect */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isConnected(tool.slug) ? (
                        <>
                          <Switch
                            checked={isEnabled(tool.slug)}
                            onCheckedChange={(enabled) =>
                              handleToolToggle(tool.slug, enabled)
                            }
                            disabled={disabled}
                            className="data-[state=checked]:bg-green-500"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDisconnect(tool.slug)}
                            disabled={disconnecting === tool.slug || disabled}
                            className="h-4 w-4 text-muted-foreground hover:text-red-600"
                          >
                            {disconnecting === tool.slug ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <X className="h-2.5 w-2.5" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <Switch
                          checked={false}
                          onCheckedChange={async (enabled) => {
                            if (enabled) {
                              await handleConnect(tool.slug);
                            }
                          }}
                          disabled={connecting === tool.slug || disabled}
                          className="opacity-50"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableTools.length === 0 && !loading && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              No tools available
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
