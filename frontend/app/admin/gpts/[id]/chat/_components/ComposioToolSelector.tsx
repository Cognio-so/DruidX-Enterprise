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
import { CheckCircle, ExternalLink, Loader2, Settings, RefreshCw, X } from "lucide-react";
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
  disabled = false 
}: ComposioToolSelectorProps) {
  console.log("ComposioToolSelector component rendered with gptId:", gptId);
  
  const [availableTools, setAvailableTools] = useState<ComposioTool[]>([]);
  const [activeConnections, setActiveConnections] = useState<string[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [connectionIds, setConnectionIds] = useState<Record<string, string>>({});

  // Fetch available tools
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

  // Fetch active connections
  const fetchConnections = async (showToast = false) => {
    console.log("fetchConnections called with gptId:", gptId);
    try {
      if (showToast) {
        setRefreshing(true);
      }
      const response = await fetch(`/api/mcp/connections/${gptId}`);
      console.log("fetchConnections response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("fetchConnections data:", data);
        
        const connectedApps = data.connections?.map((conn: any) => 
          conn.app_name?.toLowerCase()
        ) || [];
        
        // Store connection IDs for disconnect functionality
        const connectionIdMap: Record<string, string> = {};
        data.connections?.forEach((conn: any) => {
          if (conn.app_name) {
            connectionIdMap[conn.app_name.toLowerCase()] = conn.id;
          }
        });
        setConnectionIds(connectionIdMap);
        
        console.log("Setting active connections:", connectedApps);
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
    console.log("ComposioToolSelector useEffect triggered with gptId:", gptId);
    if (gptId) {
      console.log("Calling fetchConnections for gptId:", gptId);
      fetchConnections();
    } else {
      console.log("No gptId provided, skipping fetchConnections");
    }
  }, [gptId]);


  // Listen for OAuth success/error messages and URL parameters
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'mcp_oauth_success') {
        toast.success("Tool connected successfully!");
        fetchConnections(); // Refresh connections
        setOpen(false); // Close the popover
      } else if (event.data?.type === 'mcp_oauth_error') {
        toast.error("Failed to connect tool");
      }
    };

    // Check for URL parameters indicating OAuth success/error
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mcp_success') === 'true') {
      const connectionId = urlParams.get('connection_id');
      toast.success(`Tool connected successfully! ${connectionId ? `(ID: ${connectionId})` : ''}`);
      fetchConnections();
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (urlParams.get('mcp_error') === 'true') {
      const error = urlParams.get('error') || 'Failed to connect tool';
      toast.error(error);
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleToolToggle = (toolSlug: string, enabled: boolean) => {
    if (enabled) {
      setEnabledTools(prev => [...prev, toolSlug]);
    } else {
      setEnabledTools(prev => prev.filter(t => t !== toolSlug));
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
        
        // Redirect to Composio OAuth in same tab
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

  // Add disconnect handler
  const handleDisconnect = async (toolSlug: string) => {
    try {
      const connectionId = connectionIds[toolSlug.toLowerCase()];
      
      console.log(`Disconnecting ${toolSlug} with connection ID: ${connectionId}`);
      
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

      console.log(`Disconnect response status: ${response.status}`);
      const result = await response.json();
      console.log(`Disconnect response:`, result);

      if (response.ok) {
        toast.success("Tool disconnected successfully");
        // Remove from enabled tools immediately
        setEnabledTools(prev => prev.filter(t => t !== toolSlug));
        // Wait a bit for Composio to update their system, then refresh connections
        setTimeout(() => {
          console.log("Refreshing connections after disconnect...");
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

  // Notify parent component of enabled tools
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
        className="w-[800px] max-h-[400px] p-4" 
        align="center" 
        side="bottom" 
        sideOffset={10}
        avoidCollisions={true}
        collisionPadding={20}
        alignOffset={0}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Composio Tools</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {enabledTools.length} enabled
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => fetchConnections(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm">Loading tools...</span>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {/* Grid Layout - 4 columns on desktop, 2 on tablet, 1 on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {availableTools.map((tool) => (
                  <div
                    key={tool.slug}
                    className={`relative flex flex-col p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                      isConnected(tool.slug) 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-card hover:bg-accent'
                    }`}
                  >
                    {/* Tool Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <img
                          src={tool.logo}
                          alt={tool.name}
                          className="w-8 h-8 rounded-lg flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/globe.svg";
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className={`font-medium text-sm truncate ${
                            isConnected(tool.slug) ? 'text-green-700 dark:text-green-300' : 'text-foreground'
                          }`}>
                            {tool.name}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      
                      {/* Connection Status */}
                      {isConnected(tool.slug) && (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>

                    {/* Tool Actions */}
                    <div className="mt-auto">
                      {isConnected(tool.slug) ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Connected
                          </span>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={isEnabled(tool.slug)}
                              onCheckedChange={(enabled) => 
                                handleToolToggle(tool.slug, enabled)
                              }
                              disabled={disabled}
                              className="data-[state=checked]:bg-green-500"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDisconnect(tool.slug)}
                              disabled={disconnecting === tool.slug || disabled}
                              className="text-xs h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {disconnecting === tool.slug ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConnect(tool.slug)}
                          disabled={connecting === tool.slug || disabled}
                          className="w-full text-xs h-8"
                        >
                          {connecting === tool.slug ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <ExternalLink className="h-3 w-3 mr-1" />
                          )}
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {availableTools.length === 0 && !loading && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No tools available
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
